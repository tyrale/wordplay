/**
 * Browser Game Save Adapter
 *
 * Provides IndexedDB-based persistence for the active (in-progress) game.
 * Uses IndexedDB for better persistence than localStorage
 * (survives cache clears and browser restarts), with a localStorage
 * fallback for browsers without IndexedDB support.
 */

import type { GameState } from '../../packages/engine/interfaces';

const DB_NAME = 'wordplay-active-game';
const DB_VERSION = 1;
const STORE_NAME = 'game-state';
const STATE_KEY = 'current-game';

export interface SavedGame {
  state: GameState;
  savedAt: number;
}

/**
 * Initialize IndexedDB for active game storage
 */
async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Load the saved active game from IndexedDB
 */
async function loadGameFromIndexedDB(): Promise<SavedGame | null> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to load game state: ${request.error}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.state) {
          resolve(result as SavedGame);
        } else {
          resolve(null);
        }
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to load active game from IndexedDB:', error);
    return null;
  }
}

/**
 * Save the active game to IndexedDB
 */
async function saveGameToIndexedDB(state: GameState): Promise<void> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const payload: SavedGame = { state, savedAt: Date.now() };
      const request = store.put(payload, STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to save game state: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save active game to IndexedDB:', error);
    throw error;
  }
}

/**
 * Clear the saved active game from IndexedDB
 */
async function clearGameFromIndexedDB(): Promise<void> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to clear game state: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to clear active game from IndexedDB:', error);
  }
}

/**
 * localStorage fallback for browsers without IndexedDB
 */
const LOCAL_STORAGE_KEY = 'wordplay-active-game-state';

function loadGameFromLocalStorage(): SavedGame | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.state) {
        return parsed as SavedGame;
      }
    }
  } catch (error) {
    console.warn('Failed to load active game from localStorage:', error);
  }
  return null;
}

function saveGameToLocalStorage(state: GameState): void {
  try {
    const payload: SavedGame = { state, savedAt: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save active game to localStorage:', error);
  }
}

function clearGameFromLocalStorage(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear active game from localStorage:', error);
  }
}

const hasIndexedDB = typeof indexedDB !== 'undefined';

/**
 * Load the persisted active game (IndexedDB preferred, localStorage fallback)
 */
export async function loadActiveGame(): Promise<SavedGame | null> {
  if (hasIndexedDB) {
    return loadGameFromIndexedDB();
  }
  return loadGameFromLocalStorage();
}

/**
 * Persist the active game (IndexedDB preferred, localStorage fallback)
 */
export async function saveActiveGame(state: GameState): Promise<void> {
  if (hasIndexedDB) {
    await saveGameToIndexedDB(state);
    return;
  }
  saveGameToLocalStorage(state);
}

/**
 * Clear any persisted active game (IndexedDB preferred, localStorage fallback)
 */
export async function clearActiveGame(): Promise<void> {
  if (hasIndexedDB) {
    await clearGameFromIndexedDB();
    return;
  }
  clearGameFromLocalStorage();
}
