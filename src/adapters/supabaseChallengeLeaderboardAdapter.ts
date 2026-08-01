/**
 * Supabase Challenge Leaderboard Adapter
 *
 * Records the local player's daily challenge completion (step count) to a
 * server-side histogram via Supabase (see
 * `supabase/migrations/20260731160000_challenge_leaderboard.sql`), and lets
 * the UI fetch the histogram for a given challenge date. Every call silently
 * no-ops (returning `null`/empty data) if Supabase isn't configured or
 * unreachable, so the leaderboard keeps working fully offline/local-only.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureAnonymousSession } from './supabaseAuthAdapter';

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
