/**
 * Browser Unlock Adapter
 * 
 * Provides IndexedDB-based persistence for the unlock system.
 * Uses IndexedDB for better persistence than localStorage
 * (survives cache clears and browser restarts).
 */

import type { UnlockDependencies, UnlockState } from '../../engine/interfaces';
import { INITIAL_UNLOCK_STATE } from '../../engine/unlock-definitions';

const DB_NAME = 'wordplay-unlocks';
const DB_VERSION = 1;
const STORE_NAME = 'unlock-state';
const STATE_KEY = 'current-state';

/**
 * Initialize IndexedDB for unlock storage
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
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Load unlock state from IndexedDB
 */
async function loadStateFromIndexedDB(): Promise<UnlockState> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);
      
      request.onerror = () => {
        reject(new Error(`Failed to load unlock state: ${request.error}`));
      };
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          // Validate the loaded state has all required properties
          const state = result.data;
          if (state.themes && state.mechanics && state.bots && state.achievements) {
            resolve(state);
          } else {
            // Invalid state, return initial state
            resolve({ ...INITIAL_UNLOCK_STATE });
          }
        } else {
          // No saved state, return initial state
          resolve({ ...INITIAL_UNLOCK_STATE });
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to load from IndexedDB, using initial state:', error);
    return { ...INITIAL_UNLOCK_STATE };
  }
}

/**
 * Save unlock state to IndexedDB
 */
async function saveStateToIndexedDB(state: UnlockState): Promise<void> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ data: state, timestamp: Date.now() }, STATE_KEY);
      
      request.onerror = () => {
        reject(new Error(`Failed to save unlock state: ${request.error}`));
      };
      
      request.onsuccess = () => {
        resolve();
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error);
    throw error;
  }
}

/**
 * Create browser unlock dependencies
 */
export function createBrowserUnlockDependencies(): UnlockDependencies {
  return {
    loadState: loadStateFromIndexedDB,
    saveState: saveStateToIndexedDB,
    getTimestamp: () => Date.now()
  };
}

/**
 * Fallback localStorage implementation for browsers without IndexedDB
 */
export function createLocalStorageUnlockDependencies(): UnlockDependencies {
  const STORAGE_KEY = 'wordplay-unlock-state';
  
  return {
    loadState: async (): Promise<UnlockState> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate the loaded state
          if (parsed.themes && parsed.mechanics && parsed.bots && parsed.achievements) {
            return parsed;
          }
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
      return { ...INITIAL_UNLOCK_STATE };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
        throw error;
      }
    },
    
    getTimestamp: () => Date.now()
  };
}

/**
 * Create the best available browser unlock dependencies
 * (IndexedDB preferred, localStorage fallback)
 */
export function createBestBrowserUnlockDependencies(): UnlockDependencies {
  // Check if IndexedDB is available
  if (typeof indexedDB !== 'undefined') {
    return createBrowserUnlockDependencies();
  } else {
    console.warn('IndexedDB not available, falling back to localStorage');
    return createLocalStorageUnlockDependencies();
  }
} 