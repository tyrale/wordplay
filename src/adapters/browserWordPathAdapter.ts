/**
 * Browser Word Path Graph Adapter
 *
 * Provides IndexedDB-based persistence for the local word path graph (every
 * word the player has ever seen, plus the connections between them). Uses
 * IndexedDB for better persistence than localStorage (survives cache clears
 * and browser restarts), with a localStorage fallback for browsers without
 * IndexedDB support. Mirrors `browserPlayerStatsAdapter.ts`.
 */

import type { WordPathGraph, WordPathGraphDependencies } from '../../packages/engine/word-path-graph';
import { getInitialWordPathGraph, coerceWordPathGraph } from '../../packages/engine/word-path-graph';

const DB_NAME = 'wordplay-word-path-graph';
const DB_VERSION = 1;
const STORE_NAME = 'word-path-graph';
const STATE_KEY = 'current-graph';

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

async function loadStateFromIndexedDB(): Promise<WordPathGraph> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to load word path graph: ${request.error}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(coerceWordPathGraph(result?.data));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to load word path graph from IndexedDB, using initial state:', error);
    return getInitialWordPathGraph();
  }
}

async function saveStateToIndexedDB(state: WordPathGraph): Promise<void> {
  try {
    const db = await initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ data: state, timestamp: Date.now() }, STATE_KEY);

      request.onerror = () => {
        reject(new Error(`Failed to save word path graph: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save word path graph to IndexedDB:', error);
    throw error;
  }
}

/**
 * Create browser word path graph dependencies (IndexedDB-backed)
 */
export function createBrowserWordPathGraphDependencies(): WordPathGraphDependencies {
  return {
    loadState: loadStateFromIndexedDB,
    saveState: saveStateToIndexedDB,
    getTimestamp: () => Date.now()
  };
}

/**
 * Fallback localStorage implementation for browsers without IndexedDB
 */
export function createLocalStorageWordPathGraphDependencies(): WordPathGraphDependencies {
  const STORAGE_KEY = 'wordplay-word-path-graph';

  return {
    loadState: async (): Promise<WordPathGraph> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return coerceWordPathGraph(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load word path graph from localStorage:', error);
      }
      return getInitialWordPathGraph();
    },

    saveState: async (state: WordPathGraph): Promise<void> => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save word path graph to localStorage:', error);
        throw error;
      }
    },

    getTimestamp: () => Date.now()
  };
}

const hasIndexedDB = typeof indexedDB !== 'undefined';

/**
 * Create the appropriate word path graph dependencies for the current
 * browser (IndexedDB preferred, localStorage fallback)
 */
export function createWordPathGraphDependencies(): WordPathGraphDependencies {
  return hasIndexedDB ? createBrowserWordPathGraphDependencies() : createLocalStorageWordPathGraphDependencies();
}
