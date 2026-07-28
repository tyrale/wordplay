/**
 * Browser Player Stats Adapter
 *
 * Provides IndexedDB-based persistence for the local player stats log.
 * Uses IndexedDB for better persistence than localStorage
 * (survives cache clears and browser restarts), with a localStorage
 * fallback for browsers without IndexedDB support.
 */

import type { PlayerStats, PlayerStatsDependencies } from '../../packages/engine/interfaces';
import { getInitialPlayerStats } from '../../packages/engine/player-stats-definitions';

const DB_NAME = 'wordplay-player-stats';
const DB_VERSION = 1;
const STORE_NAME = 'player-stats';
const STATE_KEY = 'current-stats';

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

async function loadStateFromIndexedDB(): Promise<PlayerStats> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to load player stats: ${request.error}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data && isValidPlayerStats(result.data)) {
          resolve(withDefaults(result.data));
        } else {
          resolve(getInitialPlayerStats());
        }
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to load player stats from IndexedDB, using initial state:', error);
    return getInitialPlayerStats();
  }
}

async function saveStateToIndexedDB(state: PlayerStats): Promise<void> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ data: state, timestamp: Date.now() }, STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to save player stats: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save player stats to IndexedDB:', error);
    throw error;
  }
}

/**
 * Create browser player stats dependencies (IndexedDB-backed)
 */
export function createBrowserPlayerStatsDependencies(): PlayerStatsDependencies {
  return {
    loadState: loadStateFromIndexedDB,
    saveState: saveStateToIndexedDB,
    getTimestamp: () => Date.now()
  };
}

/**
 * Fallback localStorage implementation for browsers without IndexedDB
 */
export function createLocalStoragePlayerStatsDependencies(): PlayerStatsDependencies {
  const STORAGE_KEY = 'wordplay-player-stats';

  return {
    loadState: async (): Promise<PlayerStats> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (isValidPlayerStats(parsed)) {
            return withDefaults(parsed);
          }
        }
      } catch (error) {
        console.warn('Failed to load player stats from localStorage:', error);
      }
      return getInitialPlayerStats();
    },

    saveState: async (state: PlayerStats): Promise<void> => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save player stats to localStorage:', error);
        throw error;
      }
    },

    getTimestamp: () => Date.now()
  };
}

const hasIndexedDB = typeof indexedDB !== 'undefined';

/**
 * Create the appropriate player stats dependencies for the current browser
 * (IndexedDB preferred, localStorage fallback)
 */
export function createPlayerStatsDependencies(): PlayerStatsDependencies {
  return hasIndexedDB ? createBrowserPlayerStatsDependencies() : createLocalStoragePlayerStatsDependencies();
}
