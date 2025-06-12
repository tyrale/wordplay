/**
 * Browser Challenge Adapter
 * 
 * Provides IndexedDB-based persistence for the challenge system.
 * Uses IndexedDB for better persistence than localStorage
 * (survives cache clears and browser restarts).
 * Based on the same pattern as the unlock storage system.
 */

import type { ChallengeDependencies, ChallengeState } from '../../engine/challenge';
import type { DictionaryEngine, UtilityDependencies } from '../../engine/interfaces';

const DB_NAME = 'wordplay-challenges';
const DB_VERSION = 1;
const STORE_NAME = 'challenge-state';

/**
 * Initialize IndexedDB for challenge storage
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
 * Load challenge state from IndexedDB for a specific date
 */
async function loadStateFromIndexedDB(date: string): Promise<ChallengeState | null> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(date);
      
      request.onerror = () => {
        reject(new Error(`Failed to load challenge state: ${request.error}`));
      };
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          // Validate the loaded state has required properties
          const state = result.data;
          if (state.date && state.startWord && state.targetWord && state.wordSequence) {
            resolve(state);
          } else {
            // Invalid state, return null
            resolve(null);
          }
        } else {
          // No saved state for this date
          resolve(null);
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to load challenge from IndexedDB:', error);
    return null;
  }
}

/**
 * Save challenge state to IndexedDB
 */
async function saveStateToIndexedDB(state: ChallengeState): Promise<void> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ data: state, timestamp: Date.now() }, state.date);
      
      request.onerror = () => {
        reject(new Error(`Failed to save challenge state: ${request.error}`));
      };
      
      request.onsuccess = () => {
        resolve();
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save challenge to IndexedDB:', error);
    throw error;
  }
}

/**
 * Create browser challenge dependencies with IndexedDB storage
 */
export function createBrowserChallengeDependencies(
  dictionary: DictionaryEngine,
  utilities: UtilityDependencies
): ChallengeDependencies {
  return {
    dictionary,
    utilities,
    loadState: loadStateFromIndexedDB,
    saveState: saveStateToIndexedDB
  };
}

/**
 * Fallback localStorage implementation for browsers without IndexedDB
 */
export function createLocalStorageChallengeDependencies(
  dictionary: DictionaryEngine,
  utilities: UtilityDependencies
): ChallengeDependencies {
  const STORAGE_PREFIX = 'wordplay-challenge-';
  
  return {
    dictionary,
    utilities,
    loadState: async (date: string): Promise<ChallengeState | null> => {
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + date);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate the loaded state
          if (parsed.date && parsed.startWord && parsed.targetWord && parsed.wordSequence) {
            return parsed;
          }
        }
      } catch (error) {
        console.warn('Failed to load challenge from localStorage:', error);
      }
      return null;
    },
    
    saveState: async (state: ChallengeState): Promise<void> => {
      try {
        localStorage.setItem(STORAGE_PREFIX + state.date, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save challenge to localStorage:', error);
        throw error;
      }
    }
  };
}

/**
 * Create the best available browser challenge dependencies
 * (IndexedDB preferred, localStorage fallback)
 */
export function createBestBrowserChallengeDependencies(
  dictionary: DictionaryEngine,
  utilities: UtilityDependencies
): ChallengeDependencies {
  // Check if IndexedDB is available
  if (typeof indexedDB !== 'undefined') {
    return createBrowserChallengeDependencies(dictionary, utilities);
  } else {
    console.warn('IndexedDB not available, falling back to localStorage for challenges');
    return createLocalStorageChallengeDependencies(dictionary, utilities);
  }
} 