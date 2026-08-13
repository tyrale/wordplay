/**
 * Challenge Leaderboard Hook
 *
 * Fetches the daily challenge completion histogram (step count -> number of
 * players who completed in that many steps) for the leaderboard overlay, and
 * reports the local player's own completion so the overlay can highlight
 * their row with "YOU". Mirrors the shape/style of `useCommunityUnlockStats`.
 *
 * The local player's challenge state (start/target words, completed flag and
 * step count) is read directly from localStorage - the same key the challenge
 * engine persists to (`wordplay-challenge-<date>`) and that `Menu.tsx` already
 * reads for its "reset daily challenge" action - so we avoid re-initializing
 * a second challenge engine just to display today's words.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  fetchChallengeLeaderboard,
  type LeaderboardEntry
} from '../adapters/supabaseChallengeLeaderboardAdapter';

export interface LocalChallengeResult {
  date: string;
  startWord: string;
  targetWord: string;
  /** True only if the player reached the target word (not forfeited). */
  completed: boolean;
  /** Number of word-change steps taken (0 until the first move). */
  stepCount: number;
}

export interface ChallengeLeaderboardState {
  /** Histogram of completions, ordered by ascending step count. */
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  /** Today's challenge words + the local player's result, or null if no
   *  challenge state has been persisted yet for today. */
  localResult: LocalChallengeResult | null;
  /** Re-fetch the histogram from the server. */
  refresh: () => void;
}

/** Returns today's date as a YYYY-MM-DD string (UTC), matching the challenge
 *  engine's date format (`getCurrentDateString()` in `challenge.ts`) and
 *  `useChallenge.ts`. UTC (not local time) must be used here - the daily
 *  challenge is the same for every player worldwide and rolls over at
 *  00:00 UTC, so using local time would read/query the wrong day's
 *  challenge state and leaderboard for players outside UTC. */
export function getTodayChallengeDate(): string {
  return new Date().toISOString().split('T')[0];
}

/** Reads today's persisted challenge state from localStorage. Returns null
 *  if there is no state yet (the player hasn't opened today's challenge) or
 *  if the stored JSON is malformed. */
export function readLocalChallengeResult(date: string): LocalChallengeResult | null {
  try {
    const stored = localStorage.getItem(`wordplay-challenge-${date}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      date: parsed.date ?? date,
      startWord: parsed.startWord ?? '',
      targetWord: parsed.targetWord ?? '',
      completed: !!parsed.completed,
      stepCount: typeof parsed.stepCount === 'number' ? parsed.stepCount : 0
    };
  } catch {
    return null;
  }
}

export function useChallengeLeaderboard(challengeDate: string | null): ChallengeLeaderboardState {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<LocalChallengeResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!challengeDate) return;

    let cancelled = false;

    // Always reflect the freshest local state (covers the case where the
    // player completes the challenge while the overlay is open).
    setLocalResult(readLocalChallengeResult(challengeDate));

    setIsLoading(true);
    setError(null);

    fetchChallengeLeaderboard(challengeDate)
      .then(result => {
        if (cancelled) return;
        setEntries(result.entries);
        setIsLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('Failed to fetch challenge leaderboard:', err);
        setError('Failed to load leaderboard');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [challengeDate, refreshKey]);

  return {
    entries,
    isLoading,
    error,
    localResult,
    refresh
  };
}
