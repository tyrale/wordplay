/**
 * Unlock Engine - Core Logic
 * 
 * Platform-agnostic unlock system that manages feature unlocks
 * through dependency injection. Follows WordPlay's established
 * architecture pattern for cross-platform compatibility.
 */

import type { 
  UnlockEngine, 
  UnlockDependencies, 
  UnlockState, 
  UnlockResult 
} from './interfaces';
import { 
  UNLOCK_DEFINITIONS, 
  INITIAL_UNLOCK_STATE,
  findUnlockByTrigger 
} from './unlock-definitions';

/**
 * Creates an unlock engine instance with dependency injection
 */
export function createUnlockEngine(dependencies: UnlockDependencies): UnlockEngine {
  let currentState: UnlockState | null = null;

  /**
   * Initialize the unlock engine by loading state
   * This is optional - state will be loaded lazily when needed
   */
  async function initialize(): Promise<void> {
    await ensureStateLoaded();
  }

  /**
   * Lazy load the unlock state from dependencies
   */
  async function ensureStateLoaded(): Promise<UnlockState> {
    if (currentState === null) {
      try {
        currentState = await dependencies.loadState();
      } catch (error) {
        // If loading fails, start with initial state
        console.warn('Failed to load unlock state, using initial state:', error);
        currentState = { ...INITIAL_UNLOCK_STATE };
        // Try to save the initial state
        try {
          await dependencies.saveState(currentState);
        } catch (saveError) {
          console.warn('Failed to save initial unlock state:', saveError);
        }
      }
    }
    return currentState;
  }

  /**
   * Save current state using dependencies
   */
  async function saveState(): Promise<void> {
    if (currentState) {
      await dependencies.saveState(currentState);
    }
  }

  /**
   * Check for word-triggered unlocks
   */
  async function checkWordTriggers(word: string): Promise<UnlockResult[]> {
    const state = await ensureStateLoaded();
    const wordUnlocks = findUnlockByTrigger('word', word);
    const results: UnlockResult[] = [];

    for (const unlock of wordUnlocks) {
      // Check if this unlock is already achieved
      const wasAlreadyUnlocked = isItemUnlocked(state, unlock.category, unlock.target);
      
      if (!wasAlreadyUnlocked) {
        // Add to appropriate category
        if (unlock.category === 'theme') {
          state.themes.push(unlock.target);
        } else if (unlock.category === 'mechanic') {
          state.mechanics.push(unlock.target);
        } else if (unlock.category === 'bot') {
          state.bots.push(unlock.target);
        }

        // Create result
        const result: UnlockResult = {
          unlockId: unlock.id,
          category: unlock.category,
          target: unlock.target,
          wasAlreadyUnlocked: false,
          immediateEffect: unlock.immediate_effect
        };

        results.push(result);
      }
    }

    // Save state if any unlocks occurred
    if (results.length > 0) {
      await saveState();
    }

    return results;
  }

  /**
   * Check for achievement-triggered unlocks
   */
  async function checkAchievementTriggers(achievement: string): Promise<UnlockResult[]> {
    const state = await ensureStateLoaded();
    
    // First, add the achievement if not already present
    if (!state.achievements.includes(achievement)) {
      state.achievements.push(achievement);
    }

    // Then check for unlocks triggered by this achievement
    const achievementUnlocks = findUnlockByTrigger('achievement', achievement);
    const results: UnlockResult[] = [];

    for (const unlock of achievementUnlocks) {
      // Check if this unlock is already achieved
      const wasAlreadyUnlocked = isItemUnlocked(state, unlock.category, unlock.target);
      
      if (!wasAlreadyUnlocked) {
        // Add to appropriate category
        if (unlock.category === 'theme') {
          state.themes.push(unlock.target);
        } else if (unlock.category === 'mechanic') {
          state.mechanics.push(unlock.target);
        } else if (unlock.category === 'bot') {
          state.bots.push(unlock.target);
        }

        // Create result
        const result: UnlockResult = {
          unlockId: unlock.id,
          category: unlock.category,
          target: unlock.target,
          wasAlreadyUnlocked: false,
          immediateEffect: unlock.immediate_effect
        };

        results.push(result);
      }
    }

    // Save state if any changes occurred (achievement added or unlocks triggered)
    if (results.length > 0 || !state.achievements.includes(achievement)) {
      await saveState();
    }

    return results;
  }

  /**
   * Get all unlocked items for a specific category
   */
  function getUnlockedItems(category: 'theme' | 'mechanic' | 'bot'): string[] {
    if (!currentState) {
      // Return initial state items if state not loaded yet
      if (category === 'theme') return [...INITIAL_UNLOCK_STATE.themes];
      if (category === 'mechanic') return [...INITIAL_UNLOCK_STATE.mechanics];
      if (category === 'bot') return [...INITIAL_UNLOCK_STATE.bots];
      return [];
    }
    
    if (category === 'theme') return [...currentState.themes];
    if (category === 'mechanic') return [...currentState.mechanics];
    if (category === 'bot') return [...currentState.bots];
    return [];
  }

  /**
   * Check if a specific item is unlocked
   */
  function isUnlocked(category: 'theme' | 'mechanic' | 'bot', itemId: string): boolean {
    if (!currentState) {
      // Check against initial state if state not loaded yet
      if (category === 'theme') return INITIAL_UNLOCK_STATE.themes.includes(itemId);
      if (category === 'mechanic') return INITIAL_UNLOCK_STATE.mechanics.includes(itemId);
      if (category === 'bot') return INITIAL_UNLOCK_STATE.bots.includes(itemId);
      return false;
    }
    
    if (category === 'theme') return currentState.themes.includes(itemId);
    if (category === 'mechanic') return currentState.mechanics.includes(itemId);
    if (category === 'bot') return currentState.bots.includes(itemId);
    return false;
  }

  /**
   * Get current unlock state (for debugging/display)
   */
  function getCurrentState(): UnlockState {
    if (!currentState) {
      return {
        themes: [...INITIAL_UNLOCK_STATE.themes],
        mechanics: [...INITIAL_UNLOCK_STATE.mechanics],
        bots: [...INITIAL_UNLOCK_STATE.bots],
        achievements: [...INITIAL_UNLOCK_STATE.achievements]
      };
    }
    return {
      themes: [...currentState.themes],
      mechanics: [...currentState.mechanics],
      bots: [...currentState.bots],
      achievements: [...currentState.achievements]
    };
  }

  /**
   * Reset unlock state to initial state (for testing/debugging)
   */
  async function resetState(): Promise<void> {
    currentState = {
      themes: [...INITIAL_UNLOCK_STATE.themes],
      mechanics: [...INITIAL_UNLOCK_STATE.mechanics],
      bots: [...INITIAL_UNLOCK_STATE.bots],
      achievements: [...INITIAL_UNLOCK_STATE.achievements]
    };
    await saveState();
  }

  return {
    initialize,
    checkWordTriggers,
    checkAchievementTriggers,
    getUnlockedItems,
    isUnlocked,
    getCurrentState,
    resetState
  };
}

/**
 * Helper function to check if an item is unlocked in a given state
 */
function isItemUnlocked(
  state: UnlockState, 
  category: 'theme' | 'mechanic' | 'bot', 
  itemId: string
): boolean {
  if (category === 'theme') return state.themes.includes(itemId);
  if (category === 'mechanic') return state.mechanics.includes(itemId);
  if (category === 'bot') return state.bots.includes(itemId);
  return false;
}

/**
 * Helper function to generate achievement IDs for bot defeats
 */
export function generateBotDefeatAchievement(botId: string): string {
  return `beat_${botId.replace('-', '_')}`;
}

/**
 * Utility function to get all possible unlock triggers for debugging
 */
export function getAllUnlockTriggers(): { word: string[], achievement: string[] } {
  const wordTriggers: string[] = [];
  const achievementTriggers: string[] = [];

  for (const unlock of UNLOCK_DEFINITIONS) {
    if (unlock.trigger.type === 'word') {
      wordTriggers.push(unlock.trigger.value);
    } else if (unlock.trigger.type === 'achievement') {
      achievementTriggers.push(unlock.trigger.value);
    }
  }

  return {
    word: [...new Set(wordTriggers)].sort(),
    achievement: [...new Set(achievementTriggers)].sort()
  };
} 