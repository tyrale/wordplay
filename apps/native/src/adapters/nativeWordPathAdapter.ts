/**
 * Native Word Path Graph Adapter
 *
 * Provides AsyncStorage-based persistence for the local word path graph
 * (every word the player has ever seen, plus the connections between
 * them). Mirrors apps/web's `browserWordPathAdapter.ts` (IndexedDB with a
 * localStorage fallback) - AsyncStorage is the single persistence
 * mechanism needed here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WordPathGraph, WordPathGraphDependencies } from '@wordplay/engine/word-path-graph';
import { getInitialWordPathGraph, coerceWordPathGraph } from '@wordplay/engine/word-path-graph';

const STORAGE_KEY = 'wordplay-word-path-graph';

/** Create native (AsyncStorage-backed) word path graph dependencies. */
export function createWordPathGraphDependencies(): WordPathGraphDependencies {
  return {
    loadState: async (): Promise<WordPathGraph> => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          return coerceWordPathGraph(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load word path graph from AsyncStorage:', error);
      }
      return getInitialWordPathGraph();
    },

    saveState: async (state: WordPathGraph): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save word path graph to AsyncStorage:', error);
        throw error;
      }
    },

    getTimestamp: () => Date.now()
  };
}
