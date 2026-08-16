/**
 * Native Supabase Challenge Leaderboard Adapter.
 *
 * Direct port of apps/web's `adapters/supabaseChallengeLeaderboardAdapter.ts`
 * - this file has zero browser-specific code (no DOM/localStorage/window),
 * it's pure Supabase RPC/query logic against the already-shared
 * `challenge_leaderboard` table/`record_challenge_result` RPC, so only
 * the imports change (native's own `lib/supabase.ts` and
 * `nativeAuthAdapter.ts`, both already built in Phase 1).
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureAnonymousSession } from './nativeAuthAdapter';

export interface LeaderboardEntry {
  /** Number of word-change steps it took to complete the challenge. */
  stepCount: number;
  /** Number of unique players who completed in that many steps (incl. self). */
  playerCount: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
}

/**
 * Records that the current player completed `challengeDate`'s daily
 * challenge in `stepCount` steps. The backend only counts this the first
 * time the player completes a given day's challenge (de-duped server-side).
 * Returns the up-to-date histogram for that challenge date, or null if
 * Supabase isn't configured/unreachable.
 */
export async function recordChallengeCompletion(
  challengeDate: string,
  stepCount: number
): Promise<LeaderboardData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const userId = await ensureAnonymousSession();
    if (!userId) return null;

    const { data, error } = await supabase.rpc('record_challenge_result', {
      p_challenge_date: challengeDate,
      p_step_count: stepCount
    });
    if (error) {
      console.warn('Failed to record challenge completion:', error);
      return null;
    }

    const rows = Array.isArray(data) ? data : (data ? [data] : []);
    return {
      entries: rows.map((row: { step_count: number; player_count: number }) => ({
        stepCount: row.step_count as number,
        playerCount: row.player_count as number
      }))
    };
  } catch (error) {
    console.warn('Failed to record challenge completion:', error);
    return null;
  }
}

/**
 * Fetches the completion histogram (step count -> player count) for a given
 * challenge date. Read-only and available to any session (including
 * anonymous). Returns an empty histogram if Supabase isn't configured or
 * unreachable, so the overlay degrades gracefully offline.
 */
export async function fetchChallengeLeaderboard(challengeDate: string): Promise<LeaderboardData> {
  if (!isSupabaseConfigured()) return { entries: [] };

  try {
    const { data, error } = await supabase
      .from('challenge_leaderboard')
      .select('step_count, player_count')
      .eq('challenge_date', challengeDate)
      .order('step_count', { ascending: true });

    if (error) {
      console.warn('Failed to fetch challenge leaderboard:', error);
      return { entries: [] };
    }

    return {
      entries: (data ?? []).map((row: { step_count: number; player_count: number }) => ({
        stepCount: row.step_count as number,
        playerCount: row.player_count as number
      }))
    };
  } catch (error) {
    console.warn('Failed to fetch challenge leaderboard:', error);
    return { entries: [] };
  }
}
