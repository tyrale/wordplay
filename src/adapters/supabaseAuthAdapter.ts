/**
 * Supabase Auth Adapter
 *
 * Provides a lightweight, account-free identity for multiplayer: on first
 * use, signs the device in anonymously via Supabase Auth and ensures a
 * matching row exists in `public.users`. The user-facing display name is
 * generated once, persisted in localStorage, and editable later without
 * needing to re-authenticate.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DISPLAY_NAME_STORAGE_KEY = 'wordplay-display-name';
const DISPLAY_NAME_CONFIRMED_KEY = 'wordplay-display-name-confirmed';

/** Maximum length allowed for a player's vanity display name. */
export const MAX_DISPLAY_NAME_LENGTH = 10;

/**
 * Generate a friendly, unique-enough default display name
 * (e.g. "Player4821").
 */
function generateDefaultDisplayName(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `Player${suffix}`;
}

/**
 * Get the persisted display name, generating and persisting a default
 * one on first call.
 */
export function getDisplayName(): string {
  try {
    const stored = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
    if (stored) return stored;
  } catch (error) {
    console.warn('Failed to read display name from localStorage:', error);
  }

  const generated = generateDefaultDisplayName();
  try {
    localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, generated);
  } catch (error) {
    console.warn('Failed to persist display name to localStorage:', error);
  }
  return generated;
}

/**
 * Update the persisted display name (also updates `public.users` if a
 * session already exists).
 */
export async function setDisplayName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  if (!trimmed) return;

  try {
    localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, trimmed);
  } catch (error) {
    console.warn('Failed to persist display name to localStorage:', error);
  }

  if (!isSupabaseConfigured()) return;

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('users')
    .update({ display_name: trimmed })
    .eq('id', userId);

  if (error) {
    console.warn('Failed to update display name in Supabase:', error);
  }
}

/**
 * Whether the player has already confirmed/customized their vanity display
 * name (via the first-vshuman-game name prompt). Used to decide whether to
 * show that prompt again.
 */
export function hasConfirmedDisplayName(): boolean {
  try {
    return localStorage.getItem(DISPLAY_NAME_CONFIRMED_KEY) === 'true';
  } catch (error) {
    console.warn('Failed to read display name confirmation from localStorage:', error);
    return false;
  }
}

/** Mark the vanity display name as confirmed, so the prompt isn't shown again. */
export function markDisplayNameConfirmed(): void {
  try {
    localStorage.setItem(DISPLAY_NAME_CONFIRMED_KEY, 'true');
  } catch (error) {
    console.warn('Failed to persist display name confirmation to localStorage:', error);
  }
}

/**
 * Ensure the current device has an authenticated Supabase session
 * (signing in anonymously if needed) and that a corresponding
 * `public.users` row exists. Returns the user id, or null if Supabase
 * isn't configured (e.g. missing env vars in this environment).
 */
export async function ensureAnonymousSession(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured; multiplayer features are unavailable.');
    return null;
  }

  let userId: string | null = null;
  try {
    const { data: existing } = await supabase.auth.getSession();
    userId = existing.session?.user?.id ?? null;

    if (!userId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      userId = data.user?.id ?? null;
    }
  } catch {
    // Supabase unreachable (e.g. local dev without a running Supabase
    // instance) - fail quietly instead of a noisy uncaught-fetch stack.
    console.warn('Supabase is unreachable; multiplayer features are unavailable.');
    return null;
  }

  if (!userId) return null;

  const displayName = getDisplayName();

  // Upsert (update-on-conflict) so the row `handle_new_user()` already
  // created gets our real email placeholder/username/display name, while
  // games_played/games_won/etc. are left untouched (not included here).
  const { error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        email: `${userId}@anonymous.wordplay.local`,
        username: displayName,
        display_name: displayName
      },
      { onConflict: 'id' }
    );

  if (upsertError) {
    console.warn('Failed to upsert anonymous user profile:', upsertError);
  }

  return userId;
}

/**
 * Get the current authenticated user id, if any, without triggering a
 * new sign-in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
