/**
 * Test Unlock Adapter
 * 
 * Provides in-memory persistence for testing the unlock system.
 * Allows for controlled testing scenarios and state manipulation.
 */

import type { UnlockDependencies, UnlockState } from '../../engine/interfaces';
import { getInitialUnlockState } from '../../engine/unlock-definitions';

/**
 * Create test unlock dependencies with in-memory storage
 */
export function createTestUnlockDependencies(
  initialState?: Partial<UnlockState>
): UnlockDependencies {
  let currentState: UnlockState = {
    ...getInitialUnlockState(),
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
 * This ensures multiple engine instances share the same state
 */
export function createControlledTestUnlockDependencies(
  controlledState: UnlockState
): UnlockDependencies {
  return {
    loadState: async (): Promise<UnlockState> => {
      // Return a deep copy to prevent mutation but reflect shared state
      return {
        themes: [...controlledState.themes],
        mechanics: [...controlledState.mechanics],
        bots: [...controlledState.bots],
        achievements: [...controlledState.achievements]
      };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      // Update the controlled state by replacing arrays
      controlledState.themes = [...state.themes];
      controlledState.mechanics = [...state.mechanics];
      controlledState.bots = [...state.bots];
      controlledState.achievements = [...state.achievements];
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
  // Create a fresh copy of initial state to avoid mutation
  let currentState: UnlockState = getInitialUnlockState();

  return {
    loadState: async (): Promise<UnlockState> => {
      if (shouldFailLoad) {
        throw new Error('Simulated load failure');
      }
      return {
        themes: [...currentState.themes],
        mechanics: [...currentState.mechanics],
        bots: [...currentState.bots],
        achievements: [...currentState.achievements]
      };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      if (shouldFailSave) {
        throw new Error('Simulated save failure');
      }
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
 * Create test unlock dependencies with deterministic timestamps
 */
export function createDeterministicTestUnlockDependencies(
  fixedTimestamp = 1000000
): UnlockDependencies {
  // Create a fresh copy of initial state to avoid mutation
  let currentState: UnlockState = getInitialUnlockState();

  return {
    loadState: async (): Promise<UnlockState> => {
      return {
        themes: [...currentState.themes],
        mechanics: [...currentState.mechanics],
        bots: [...currentState.bots],
        achievements: [...currentState.achievements]
      };
    },
    
    saveState: async (state: UnlockState): Promise<void> => {
      currentState = {
        themes: [...state.themes],
        mechanics: [...state.mechanics],
        bots: [...state.bots],
        achievements: [...state.achievements]
      };
    },
    
    getTimestamp: () => fixedTimestamp
  };
} 