/**
 * Supabase Community Unlocks Adapter
 *
 * Reports first-time unlocks to a community-wide, cross-player counter via
 * Supabase (see `supabase/migrations/20260727150000_community_unlocks.sql`),
 * and lets the UI fetch the full set of community counts (e.g. for the
 * "world" mechanic's menu stats). Every call silently no-ops (resolving to
 * `null`/empty data) if Supabase isn't configured or unreachable, so the
 * unlock system keeps working fully offline/local-only.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureAnonymousSession } from './supabaseAuthAdapter';

export interface RecordCommunityUnlockResult {
  count: number;
  totalPlayers: number;
}

/**
 * Reports that the current player triggered `unlockId`. The backend only
 * increments the community count the first time this particular player
 * unlocks this particular item (de-duped server-side), regardless of how
 * many times this is called for the same unlock.
 */
export async function recordCommunityUnlock(unlockId: string): Promise<RecordCommunityUnlockResult | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const userId = await ensureAnonymousSession();
    if (!userId) return null;

    const { data, error } = await supabase.rpc('record_community_unlock', { p_unlock_id: unlockId });
    if (error) {
      console.warn(`Failed to record community unlock for "${unlockId}":`, error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return { count: row.unlock_count, totalPlayers: row.total_players };
  } catch (error) {
    console.warn(`Failed to record community unlock for "${unlockId}":`, error);
    return null;
  }
}

export interface CommunityUnlockStats {
  /** Map of unlock id -> number of unique players who have triggered it. */
  counts: Record<string, number>;
  /** Total number of known players (rows in `public.users`). */
  totalPlayers: number;
}

/**
 * Fetches every unlock's community count plus the total player count, for
 * displaying community-wide progress (e.g. the "world" mechanic's menu
 * stats line). Read-only and available to any session (including anonymous).
 */
export async function fetchCommunityUnlockStats(): Promise<CommunityUnlockStats> {
  if (!isSupabaseConfigured()) return { counts: {}, totalPlayers: 0 };

  try {
    const [{ data: countRows, error: countsError }, { data: statsRow, error: statsError }] = await Promise.all([
      supabase.from('community_unlock_counts').select('unlock_id, unlock_count'),
      supabase.from('community_stats').select('total_players').eq('id', true).maybeSingle()
    ]);

    if (countsError) console.warn('Failed to fetch community unlock counts:', countsError);
    if (statsError) console.warn('Failed to fetch community stats:', statsError);

    const counts: Record<string, number> = {};
    for (const row of countRows ?? []) {
      counts[row.unlock_id as string] = row.unlock_count as number;
    }

    return { counts, totalPlayers: (statsRow?.total_players as number) ?? 0 };
  } catch (error) {
    console.warn('Failed to fetch community unlock stats:', error);
    return { counts: {}, totalPlayers: 0 };
  }
}

/** Rounds a count/total into a whole-number percentage, floored at 1% for any nonzero count so rare unlocks don't display as "0% found". */
export function computeUnlockPercentage(count: number, totalPlayers: number): number {
  if (totalPlayers <= 0 || count <= 0) return 0;
  return Math.max(1, Math.round((count / totalPlayers) * 100));
}
