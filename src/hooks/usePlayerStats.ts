/**
 * React Hook for Player Stats Integration
 *
 * Provides player stats state management and game-result recording
 * for the web app. Integrates the platform-agnostic player stats engine
 * with React state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPlayerStatsEngine } from '../../packages/engine/player-stats';
import { getInitialPlayerStats } from '../../packages/engine/player-stats-definitions';
import { createPlayerStatsDependencies } from '../adapters/browserPlayerStatsAdapter';
import type { PlayerStatsEngine, PlayerStats, GameResultSummary, ChallengeResultSummary, TurnHistory } from '../../packages/engine/interfaces';

export interface UsePlayerStatsReturn {
  stats: PlayerStats;
  isLoading: boolean;

  recordMove: (move: TurnHistory) => Promise<PlayerStats>;
  recordGameResult: (result: GameResultSummary) => Promise<PlayerStats>;
  recordChallengeResult: (result: ChallengeResultSummary) => Promise<PlayerStats>;
  recordUnlockEarned: () => Promise<PlayerStats>;
  resetStats: () => Promise<void>;
}

/**
 * Hook for managing player stats in React components
 */
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
