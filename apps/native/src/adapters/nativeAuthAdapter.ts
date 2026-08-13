/**
 * Native Auth Adapter
 *
 * Mirrors apps/web's `supabaseAuthAdapter.ts`: a lightweight, account-free
 * identity for multiplayer via Supabase anonymous auth, with a vanity
 * display name persisted locally (AsyncStorage here instead of
 * `localStorage`). All the actual Supabase logic is identical to the web
 * adapter - only the storage backend changes, so keep this in sync with
 * apps/web/src/adapters/supabaseAuthAdapter.ts if that logic changes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DISPLAY_NAME_STORAGE_KEY = 'wordplay-display-name';
const DISPLAY_NAME_CONFIRMED_KEY = 'wordplay-display-name-confirmed';

/** Maximum length allowed for a player's vanity display name. */
export const MAX_DISPLAY_NAME_LENGTH = 10;

function generateDefaultDisplayName(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `Player${suffix}`;
}

/**
 * In-memory cache of the display name so `getDisplayName()` can stay
 * synchronous (matching the web adapter's API, which callers rely on),
 * even though AsyncStorage itself is async. Populated by
 * `preloadDisplayName()`, which should be called once at app startup
 * before any synchronous `getDisplayName()` call.
 */
let cachedDisplayName: string | null = null;

/**
 * Load (and cache) the persisted display name, generating and persisting
 * a default one on first call. Call this once at startup; `getDisplayName()`
 * then reads the cache synchronously.
 */
export async function preloadDisplayName(): Promise<string> {
  if (cachedDisplayName) return cachedDisplayName;

  try {
    const stored = await AsyncStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
    if (stored) {
      cachedDisplayName = stored;
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read display name from AsyncStorage:', error);
  }

  const generated = generateDefaultDisplayName();
  cachedDisplayName = generated;
  try {
    await AsyncStorage.setItem(DISPLAY_NAME_STORAGE_KEY, generated);
  } catch (error) {
    console.warn('Failed to persist display name to AsyncStorage:', error);
  }
  return generated;
}

/**
 * Get the cached display name synchronously. Returns a freshly-generated
 * (uncached) default if `preloadDisplayName()` hasn't been called yet -
 * callers should prefer calling `preloadDisplayName()` at startup so this
 * always returns the real persisted value.
 */
export function getDisplayName(): string {
  if (cachedDisplayName) return cachedDisplayName;
  return generateDefaultDisplayName();
}

/**
 * Update the persisted display name (also updates `public.users` if a
 * session already exists).
 */
export async function setDisplayName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  if (!trimmed) return;

  cachedDisplayName = trimmed;
  try {
    await AsyncStorage.setItem(DISPLAY_NAME_STORAGE_KEY, trimmed);
  } catch (error) {
    console.warn('Failed to persist display name to AsyncStorage:', error);
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
 * Whether the player has already confirmed/customized their vanity
 * display name. Used to decide whether to show that prompt again.
 */
export async function hasConfirmedDisplayName(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DISPLAY_NAME_CONFIRMED_KEY)) === 'true';
  } catch (error) {
    console.warn('Failed to read display name confirmation from AsyncStorage:', error);
    return false;
  }
}

/** Mark the vanity display name as confirmed, so the prompt isn't shown again. */
export async function markDisplayNameConfirmed(): Promise<void> {
  try {
    await AsyncStorage.setItem(DISPLAY_NAME_CONFIRMED_KEY, 'true');
  } catch (error) {
    console.warn('Failed to persist display name confirmation to AsyncStorage:', error);
  }
}

/**
 * Ensure the current device has an authenticated Supabase session
 * (signing in anonymously if needed) and that a corresponding
 * `public.users` row exists. Returns the user id, or null if Supabase
 * isn't configured or unreachable.
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
    console.warn('Supabase is unreachable; multiplayer features are unavailable.');
    return null;
  }

  if (!userId) return null;

  const displayName = await preloadDisplayName();

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
