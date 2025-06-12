/**
 * Test Unlock Adapter
 * 
 * Provides in-memory persistence for testing the unlock system.
 * Allows for controlled testing scenarios and state manipulation.
 */

import type { UnlockDependencies, UnlockState } from '../../engine/interfaces';
import { INITIAL_UNLOCK_STATE } from '../../engine/unlock-definitions';

/**
 * Create test unlock dependencies with in-memory storage
 */
export function createTestUnlockDependencies(
  initialState?: Partial<UnlockState>
): UnlockDependencies {
  let currentState: UnlockState = {
    ...INITIAL_UNLOCK_STATE,
    ...initialState
  };

  return {
    loadState: async (): Promise<UnlockState> => {
      // Return a copy to prevent external mutation
      return {
        themes: [...currentState.themes],
        mechanics: [...currentState.mechanics],
        bots: [...currentState.bots],
        achievements: [...currentState.achievements]
      };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      // Store a copy to prevent external mutation
      currentState = {
        themes: [...state.themes],
        mechanics: [...state.mechanics],
        bots: [...state.bots],
        achievements: [...state.achievements]
      };
    },
    
    getTimestamp: () => Date.now()
  };
}

/**
 * Create test unlock dependencies with controlled state
 */
export function createControlledTestUnlockDependencies(
  controlledState: UnlockState
): UnlockDependencies {
  return {
    loadState: async (): Promise<UnlockState> => {
      return { ...controlledState };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      // Update the controlled state
      Object.assign(controlledState, state);
    },
    
    getTimestamp: () => Date.now()
  };
}

/**
 * Create test unlock dependencies that simulate failures
 */
export function createFailingTestUnlockDependencies(
  shouldFailLoad = false,
  shouldFailSave = false
): UnlockDependencies {
  let currentState: UnlockState = { ...INITIAL_UNLOCK_STATE };

  return {
    loadState: async (): Promise<UnlockState> => {
      if (shouldFailLoad) {
        throw new Error('Simulated load failure');
      }
      return { ...currentState };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      if (shouldFailSave) {
        throw new Error('Simulated save failure');
      }
      currentState = { ...state };
    },
    
    getTimestamp: () => Date.now()
  };
}

/**
 * Create test unlock dependencies with deterministic timestamps
 */
export function createDeterministicTestUnlockDependencies(
  fixedTimestamp = 1000000
): UnlockDependencies {
  let currentState: UnlockState = { ...INITIAL_UNLOCK_STATE };

  return {
    loadState: async (): Promise<UnlockState> => {
      return { ...currentState };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      currentState = { ...state };
    },
    
    getTimestamp: () => fixedTimestamp
  };
} 