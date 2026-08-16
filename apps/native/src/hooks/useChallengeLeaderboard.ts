/**
 * Native Challenge Leaderboard Hook.
 *
 * Direct port of apps/web's `hooks/useChallengeLeaderboard.ts` - the
 * local player's own challenge state is read from AsyncStorage instead
 * of localStorage (made async; same `wordplay-challenge-<date>` key
 * format the challenge engine already persists to, matching web exactly
 * so a future account-linking/migration feature isn't blocked by
 * mismatched storage formats).
 */
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchChallengeLeaderboard
} from '../adapters/nativeChallengeLeaderboardAdapter';
import type { LeaderboardEntry } from '../adapters/nativeChallengeLeaderboardAdapter';

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
 *  engine's date format and useChallenge.ts. UTC (not local time) must be
 *  used here - the daily challenge is the same for every player worldwide
 *  and rolls over at 00:00 UTC. */
export function getTodayChallengeDate(): string {
  return new Date().toISOString().split('T')[0];
}

/** Reads today's persisted challenge state from AsyncStorage. Returns null
 *  if there is no state yet (the player hasn't opened today's challenge) or
 *  if the stored JSON is malformed. */
export async function readLocalChallengeResult(date: string): Promise<LocalChallengeResult | null> {
  try {
    const stored = await AsyncStorage.getItem(`wordplay-challenge-${date}`);
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

    readLocalChallengeResult(challengeDate).then(result => {
      if (!cancelled) setLocalResult(result);
    });

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
