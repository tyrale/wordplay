/**
 * Native Game Save Adapter
 *
 * Provides AsyncStorage-based persistence for the active (in-progress)
 * game. Mirrors apps/web's `browserGameSaveAdapter.ts` (which uses
 * IndexedDB with a localStorage fallback) - AsyncStorage is the single,
 * standard persistence mechanism on React Native, so there's no
 * equivalent fallback dance needed here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState } from '@wordplay/engine/interfaces';

const STORAGE_KEY = 'wordplay-active-game-state';

export interface SavedGame {
  state: GameState;
  savedAt: number;
}

/** Load the persisted active game, if any. */
export async function loadActiveGame(): Promise<SavedGame | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.state) {
        return parsed as SavedGame;
      }
    }
  } catch (error) {
    console.warn('Failed to load active game from AsyncStorage:', error);
  }
  return null;
}

/** Persist the active game. */
export async function saveActiveGame(state: GameState): Promise<void> {
  try {
    const payload: SavedGame = { state, savedAt: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save active game to AsyncStorage:', error);
    throw error;
  }
}

/** Clear any persisted active game. */
export async function clearActiveGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear active game from AsyncStorage:', error);
  }
}
