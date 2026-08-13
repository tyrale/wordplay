/**
 * Native Unlock Adapter
 *
 * Provides AsyncStorage-based persistence for the unlock system. Mirrors
 * apps/web's `browserUnlockAdapter.ts` (IndexedDB with a localStorage
 * fallback) - AsyncStorage is the single persistence mechanism needed here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UnlockDependencies, UnlockState } from '@wordplay/engine/interfaces';
import { INITIAL_UNLOCK_STATE } from '@wordplay/engine/unlock-definitions';
import { recordCommunityUnlock } from './nativeCommunityUnlocksAdapter';

const STORAGE_KEY = 'wordplay-unlock-state';

/** Create native (AsyncStorage-backed) unlock dependencies. */
export function createUnlockDependencies(): UnlockDependencies {
  return {
    loadState: async (): Promise<UnlockState> => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate the loaded state has all required properties.
          if (parsed.themes && parsed.mechanics && parsed.bots && parsed.achievements) {
            // Backward compatibility: default 'reveals'/'hasUsedReset' if
            // missing from a state saved before those fields existed.
            return { reveals: [], hasUsedReset: false, ...parsed };
          }
        }
      } catch (error) {
        console.warn('Failed to load unlock state from AsyncStorage:', error);
      }
      return { ...INITIAL_UNLOCK_STATE };
    },

    saveState: async (state: UnlockState): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save unlock state to AsyncStorage:', error);
        throw error;
      }
    },

    getTimestamp: () => Date.now(),
    recordCommunityUnlock
  };
}
