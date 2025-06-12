/**
 * Node.js Unlock Adapter
 * 
 * Provides file system-based persistence for the unlock system
 * in terminal/Node.js environments.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { UnlockDependencies, UnlockState } from '../../engine/interfaces';
import { INITIAL_UNLOCK_STATE } from '../../engine/unlock-definitions';

// Store unlock data in user's home directory
const UNLOCK_DIR = join(homedir(), '.wordplay');
const UNLOCK_FILE = join(UNLOCK_DIR, 'unlocks.json');

/**
 * Ensure the unlock directory exists
 */
async function ensureUnlockDirectory(): Promise<void> {
  try {
    await fs.mkdir(UNLOCK_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Load unlock state from file system
 */
async function loadStateFromFile(): Promise<UnlockState> {
  try {
    await ensureUnlockDirectory();
    
    const data = await fs.readFile(UNLOCK_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Validate the loaded state has all required properties
    if (parsed.themes && parsed.mechanics && parsed.bots && parsed.achievements) {
      return parsed;
    } else {
      // Invalid state, return initial state
      return { ...INITIAL_UNLOCK_STATE };
    }
  } catch (error) {
    // File doesn't exist or is invalid, return initial state
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...INITIAL_UNLOCK_STATE };
    }
    
    console.warn('Failed to load unlock state from file:', error);
    return { ...INITIAL_UNLOCK_STATE };
  }
}

/**
 * Save unlock state to file system
 */
async function saveStateToFile(state: UnlockState): Promise<void> {
  try {
    await ensureUnlockDirectory();
    
    const data = JSON.stringify({
      ...state,
      lastUpdated: Date.now()
    }, null, 2);
    
    await fs.writeFile(UNLOCK_FILE, data, 'utf-8');
  } catch (error) {
    console.error('Failed to save unlock state to file:', error);
    throw error;
  }
}

/**
 * Create Node.js unlock dependencies
 */
export function createNodeUnlockDependencies(): UnlockDependencies {
  return {
    loadState: loadStateFromFile,
    saveState: saveStateToFile,
    getTimestamp: () => Date.now()
  };
}

/**
 * Utility function to get the unlock file path (for debugging)
 */
export function getUnlockFilePath(): string {
  return UNLOCK_FILE;
}

/**
 * Utility function to reset unlock state by deleting the file
 */
export async function resetUnlockFile(): Promise<void> {
  try {
    await fs.unlink(UNLOCK_FILE);
  } catch (error) {
    // File might not exist, that's fine
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
} 