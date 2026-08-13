/**
 * Native Player Stats Adapter
 *
 * Provides AsyncStorage-based persistence for the local player stats log.
 * Mirrors apps/web's `browserPlayerStatsAdapter.ts` (IndexedDB with a
 * localStorage fallback) - AsyncStorage is the single persistence
 * mechanism needed here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlayerStats, PlayerStatsDependencies } from '@wordplay/engine/interfaces';
import { getInitialPlayerStats } from '@wordplay/engine/player-stats-definitions';

const STORAGE_KEY = 'wordplay-player-stats';

/**
 * Fields that must be present for a loaded object to be considered a
 * valid PlayerStats record (guards against corrupt/partial data).
 */
function isValidPlayerStats(value: unknown): value is PlayerStats {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.gamesPlayed === 'number' &&
    typeof state.totalWordsPlayed === 'number' &&
    typeof state.botRecords === 'object' &&
    Array.isArray(state.botsBeaten)
  );
}

/**
 * Merge loaded state with initial state defaults so newly-added stat
 * fields default sensibly for existing users with older saved data.
 */
function withDefaults(loaded: Partial<PlayerStats>): PlayerStats {
  return { ...getInitialPlayerStats(), ...loaded };
}

/** Create native (AsyncStorage-backed) player stats dependencies. */
export function createPlayerStatsDependencies(): PlayerStatsDependencies {
  return {
    loadState: async (): Promise<PlayerStats> => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (isValidPlayerStats(parsed)) {
            return withDefaults(parsed);
          }
        }
      } catch (error) {
        console.warn('Failed to load player stats from AsyncStorage:', error);
      }
      return getInitialPlayerStats();
    },

    saveState: async (state: PlayerStats): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save player stats to AsyncStorage:', error);
        throw error;
      }
    },

    getTimestamp: () => Date.now()
  };
}
