/**
 * Native usePlayerStats hook.
 *
 * Direct port of apps/web's `hooks/usePlayerStats.ts` - this hook has no
 * DOM/browser dependency (pure React state + calls into the dependency-
 * injected player stats engine), so only the adapter import changes:
 * nativePlayerStatsAdapter's AsyncStorage-backed dependencies instead of
 * the browser's IndexedDB-backed ones (already built in Phase 1). Keep
 * in sync with the web version if its logic changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPlayerStatsEngine } from '@wordplay/engine/player-stats';
import { getInitialPlayerStats } from '@wordplay/engine/player-stats-definitions';
import { createPlayerStatsDependencies } from '../adapters/nativePlayerStatsAdapter';
import type { PlayerStatsEngine, PlayerStats, GameResultSummary, ChallengeResultSummary, TurnHistory } from '@wordplay/engine/interfaces';

export interface UsePlayerStatsReturn {
  stats: PlayerStats;
  isLoading: boolean;

  recordMove: (move: TurnHistory) => Promise<PlayerStats>;
  recordGameResult: (result: GameResultSummary) => Promise<PlayerStats>;
  recordChallengeResult: (result: ChallengeResultSummary) => Promise<PlayerStats>;
  recordUnlockEarned: () => Promise<PlayerStats>;
  resetStats: () => Promise<void>;
}

export function usePlayerStats(): UsePlayerStatsReturn {
  const [stats, setStats] = useState<PlayerStats>(getInitialPlayerStats());
  const [isLoading, setIsLoading] = useState(true);
  const engineRef = useRef<PlayerStatsEngine | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeEngine = async () => {
      try {
        const dependencies = createPlayerStatsDependencies();
        const engine = createPlayerStatsEngine(dependencies);

        if (mounted) {
          engineRef.current = engine;
          await engine.initialize();
          setStats(engine.getStats());
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize player stats engine:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeEngine();

    return () => {
      mounted = false;
    };
  }, []);

  const recordMove = useCallback(async (move: TurnHistory): Promise<PlayerStats> => {
    if (!engineRef.current) return stats;

    try {
      const newStats = await engineRef.current.recordMove(move);
      setStats(newStats);
      return newStats;
    } catch (error) {
      console.error('Error recording move:', error);
      return stats;
    }
  }, [stats]);

  const recordGameResult = useCallback(async (result: GameResultSummary): Promise<PlayerStats> => {
    if (!engineRef.current) return stats;

    try {
      const newStats = await engineRef.current.recordGameResult(result);
      setStats(newStats);
      return newStats;
    } catch (error) {
      console.error('Error recording game result:', error);
      return stats;
    }
  }, [stats]);

  const recordChallengeResult = useCallback(async (result: ChallengeResultSummary): Promise<PlayerStats> => {
    if (!engineRef.current) return stats;

    try {
      const newStats = await engineRef.current.recordChallengeResult(result);
      setStats(newStats);
      return newStats;
    } catch (error) {
      console.error('Error recording challenge result:', error);
      return stats;
    }
  }, [stats]);

  const recordUnlockEarned = useCallback(async (): Promise<PlayerStats> => {
    if (!engineRef.current) return stats;

    try {
      const newStats = await engineRef.current.recordUnlockEarned();
      setStats(newStats);
      return newStats;
    } catch (error) {
      console.error('Error recording unlock earned:', error);
      return stats;
    }
  }, [stats]);

  const resetStats = useCallback(async (): Promise<void> => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.resetStats();
      setStats(engineRef.current.getStats());
    } catch (error) {
      console.error('Error resetting player stats:', error);
    }
  }, []);

  return {
    stats,
    isLoading,
    recordMove,
    recordGameResult,
    recordChallengeResult,
    recordUnlockEarned,
    resetStats
  };
}
