/**
 * Unlock Engine Tests
 * 
 * Comprehensive tests for the unlock system including word triggers,
 * achievement triggers, state persistence, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createUnlockEngine, generateBotDefeatAchievement, getAllUnlockTriggers } from '../unlocks';
import { createTestUnlockDependencies, createFailingTestUnlockDependencies, createControlledTestUnlockDependencies } from '../../adapters/test/unlocks';
import type { UnlockEngine, UnlockState } from '../interfaces';
import { INITIAL_UNLOCK_STATE } from '../unlock-definitions';

describe('Unlock Engine', () => {
  let unlockEngine: UnlockEngine;

  beforeEach(() => {
    const dependencies = createTestUnlockDependencies();
    unlockEngine = createUnlockEngine(dependencies);
  });

  describe('Initial State', () => {
    it('should start with initial unlock state', () => {
      const state = unlockEngine.getCurrentState();
      expect(state).toEqual(INITIAL_UNLOCK_STATE);
    });

    it('should have only default theme unlocked initially', () => {
      expect(unlockEngine.isUnlocked('theme', 'classic blue')).toBe(true);
      expect(unlockEngine.isUnlocked('theme', 'red')).toBe(false);
      expect(unlockEngine.isUnlocked('theme', 'blue')).toBe(false);
    });

    it('should have only basicBot bot unlocked initially', () => {
      expect(unlockEngine.isUnlocked('bot', 'basicBot')).toBe(true);
      expect(unlockEngine.isUnlocked('bot', 'easy-bot')).toBe(false);
      expect(unlockEngine.isUnlocked('bot', 'pirate-bot')).toBe(false);
    });

    it('should have no mechanics unlocked initially', () => {
      expect(unlockEngine.getUnlockedItems('mechanic')).toEqual([]);
      expect(unlockEngine.isUnlocked('mechanic', '5-letter-start')).toBe(false);
    });
  });

  describe('Word Triggers', () => {
    it('should unlock red theme when playing "red"', async () => {
      const results = await unlockEngine.checkWordTriggers('red');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        category: 'theme',
        target: 'red',
        wasAlreadyUnlocked: false,
        immediateEffect: { type: 'apply_theme', value: 'red' }
      });

      expect(unlockEngine.isUnlocked('theme', 'red')).toBe(true);
    });

    it('should unlock multiple themes with different words', async () => {
      await unlockEngine.checkWordTriggers('red');
      await unlockEngine.checkWordTriggers('blue');
      await unlockEngine.checkWordTriggers('green');

      expect(unlockEngine.isUnlocked('theme', 'red')).toBe(true);
      expect(unlockEngine.isUnlocked('theme', 'blue')).toBe(true);
      expect(unlockEngine.isUnlocked('theme', 'green')).toBe(true);
      
      const unlockedThemes = unlockEngine.getUnlockedItems('theme');
      expect(unlockedThemes).toContain('red');
      expect(unlockedThemes).toContain('blue');
      expect(unlockedThemes).toContain('green');
    });

    it('should unlock mechanics with word triggers', async () => {
      const results = await unlockEngine.checkWordTriggers('five');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        category: 'mechanic',
        target: '5-letter-start',
        wasAlreadyUnlocked: false
      });

      expect(unlockEngine.isUnlocked('mechanic', '5-letter-start')).toBe(true);
    });

    it('should unlock bots with word triggers', async () => {
      const results = await unlockEngine.checkWordTriggers('pirate');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        category: 'bot',
        target: 'pirate-bot',
        wasAlreadyUnlocked: false
      });

      expect(unlockEngine.isUnlocked('bot', 'pirate-bot')).toBe(true);
    });

    it('should not unlock already unlocked items', async () => {
      // First unlock
      await unlockEngine.checkWordTriggers('red');
      expect(unlockEngine.isUnlocked('theme', 'red')).toBe(true);

      // Second attempt
      const results = await unlockEngine.checkWordTriggers('red');
      expect(results).toHaveLength(0);
    });

    it('should handle case-insensitive word matching', async () => {
      const results1 = await unlockEngine.checkWordTriggers('RED');
      const results2 = await unlockEngine.checkWordTriggers('Blue');
      const results3 = await unlockEngine.checkWordTriggers('GREEN');

      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results3).toHaveLength(1);
      
      expect(unlockEngine.isUnlocked('theme', 'red')).toBe(true);
      expect(unlockEngine.isUnlocked('theme', 'blue')).toBe(true);
      expect(unlockEngine.isUnlocked('theme', 'green')).toBe(true);
    });

    it('should return empty array for non-trigger words', async () => {
      const results = await unlockEngine.checkWordTriggers('hello');
      expect(results).toHaveLength(0);
      
      const state = unlockEngine.getCurrentState();
      expect(state).toEqual(INITIAL_UNLOCK_STATE);
    });
  });

  describe('Achievement Triggers', () => {
    it('should unlock easy bot when beating basicBot', async () => {
      const results = await unlockEngine.checkAchievementTriggers('beat_basicBot');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        category: 'bot',
        target: 'easy-bot',
        wasAlreadyUnlocked: false
      });

      expect(unlockEngine.isUnlocked('bot', 'easy-bot')).toBe(true);
      
      const state = unlockEngine.getCurrentState();
      expect(state.achievements).toContain('beat_basicBot');
    });

    it('should chain bot unlocks through achievements', async () => {
      // Beat tester -> unlock easy bot
      await unlockEngine.checkAchievementTriggers('beat_basicBot');
      expect(unlockEngine.isUnlocked('bot', 'easy-bot')).toBe(true);

      // Beat easy bot -> unlock medium bot
      await unlockEngine.checkAchievementTriggers('beat_easy_bot');
      expect(unlockEngine.isUnlocked('bot', 'medium-bot')).toBe(true);

      // Beat medium bot -> unlock hard bot
      await unlockEngine.checkAchievementTriggers('beat_medium_bot');
      expect(unlockEngine.isUnlocked('bot', 'hard-bot')).toBe(true);
    });

    it('should track achievements even if no unlocks triggered', async () => {
      await unlockEngine.checkAchievementTriggers('custom_achievement');
      
      const state = unlockEngine.getCurrentState();
      expect(state.achievements).toContain('custom_achievement');
    });

    it('should not duplicate achievements', async () => {
      await unlockEngine.checkAchievementTriggers('beat_basicBot');
      await unlockEngine.checkAchievementTriggers('beat_basicBot');
      
      const state = unlockEngine.getCurrentState();
      const achievementCount = state.achievements.filter(a => a === 'beat_basicBot').length;
      expect(achievementCount).toBe(1);
    });
  });

  describe('State Management', () => {
    it('should persist state across engine instances', async () => {
      // Create shared state object
      const sharedState: UnlockState = {
        themes: ['classic blue'],
        mechanics: [],
        bots: ['basicBot'],
        achievements: []
      };
      
      // Create shared dependencies
      const sharedDependencies = createControlledTestUnlockDependencies(sharedState);
      const firstEngine = createUnlockEngine(sharedDependencies);
      
      // First engine instance makes unlocks
      await firstEngine.checkWordTriggers('red');
      await firstEngine.checkAchievementTriggers('beat_basicBot');

      // Create new engine instance with same dependencies
      const newEngine = createUnlockEngine(sharedDependencies);
      
      // Initialize the new engine to load shared state
      await newEngine.initialize();
      
      // State should be loaded from dependencies
      expect(newEngine.isUnlocked('theme', 'red')).toBe(true);
      expect(newEngine.isUnlocked('bot', 'easy-bot')).toBe(true);
    });

    it('should reset state correctly', async () => {
      // Make some unlocks
      await unlockEngine.checkWordTriggers('red');
      await unlockEngine.checkWordTriggers('blue');
      await unlockEngine.checkAchievementTriggers('beat_basicBot');

      // Reset state
      await unlockEngine.resetState();

      // Should be back to initial state
      const state = unlockEngine.getCurrentState();
      expect(state).toEqual(INITIAL_UNLOCK_STATE);
      expect(unlockEngine.isUnlocked('theme', 'red')).toBe(false);
      expect(unlockEngine.isUnlocked('theme', 'blue')).toBe(false);
      expect(unlockEngine.isUnlocked('bot', 'easy-bot')).toBe(false);
    });

    it('should return copies of state to prevent mutation', () => {
      const state1 = unlockEngine.getCurrentState();
      const state2 = unlockEngine.getCurrentState();
      
      // Should be equal but not the same object
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
      
      // Mutating one shouldn't affect the other
      state1.themes.push('mutated');
      expect(state2.themes).not.toContain('mutated');
    });

    it('should return copies of unlocked items to prevent mutation', () => {
      const themes1 = unlockEngine.getUnlockedItems('theme');
      const themes2 = unlockEngine.getUnlockedItems('theme');
      
      expect(themes1).toEqual(themes2);
      expect(themes1).not.toBe(themes2);
      
      themes1.push('mutated');
      expect(themes2).not.toContain('mutated');
    });
  });

  describe('Error Handling', () => {
    it('should handle load failures gracefully', async () => {
      const failingDeps = createFailingTestUnlockDependencies(true, false);
      const engine = createUnlockEngine(failingDeps);
      
      // Should fall back to initial state
      const state = engine.getCurrentState();
      expect(state).toEqual(INITIAL_UNLOCK_STATE);
      
      // Should still be able to make unlocks
      const results = await engine.checkWordTriggers('red');
      expect(results).toHaveLength(1);
    });

    it('should handle save failures gracefully', async () => {
      const failingDeps = createFailingTestUnlockDependencies(false, true);
      const engine = createUnlockEngine(failingDeps);
      
      // Initialize the engine first (this should succeed)
      await engine.initialize();
      
      // Verify the theme is not unlocked initially (should be clean state)
      expect(engine.isUnlocked('theme', 'red')).toBe(false);
      
      // This should trigger an unlock and then fail on save
      await expect(engine.checkWordTriggers('red')).rejects.toThrow('Simulated save failure');
    });
  });

  describe('Utility Functions', () => {
    it('should generate correct bot defeat achievement IDs', () => {
      expect(generateBotDefeatAchievement('easy-bot')).toBe('beat_easy_bot');
      expect(generateBotDefeatAchievement('medium-bot')).toBe('beat_medium_bot');
      expect(generateBotDefeatAchievement('pirate-bot')).toBe('beat_pirate_bot');
    });

    it('should return all unlock triggers', () => {
      const triggers = getAllUnlockTriggers();
      
      expect(triggers.word).toContain('red');
      expect(triggers.word).toContain('blue');
      expect(triggers.word).toContain('five');
      expect(triggers.word).toContain('pirate');
      
      expect(triggers.achievement).toContain('beat_basicBot');
      expect(triggers.achievement).toContain('beat_easy_bot');
      
      // Should be sorted and unique
      expect(triggers.word).toEqual([...new Set(triggers.word)].sort());
      expect(triggers.achievement).toEqual([...new Set(triggers.achievement)].sort());
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple unlocks from single word', async () => {
      // Create fresh engine for this test with explicit clean state
      const freshDeps = createTestUnlockDependencies({
        themes: ['classic blue'],
        mechanics: [],
        bots: ['basicBot'],
        achievements: []
      });
      const freshEngine = createUnlockEngine(freshDeps);
      
      // Initialize the fresh engine
      await freshEngine.initialize();
      
      // Verify initial state
      expect(freshEngine.isUnlocked('theme', 'red')).toBe(false);
      
      // If a word triggers multiple unlocks (edge case)
      const results = await freshEngine.checkWordTriggers('red');
      expect(results).toHaveLength(1); // Only red theme should unlock
      
      // Verify unlock worked
      expect(freshEngine.isUnlocked('theme', 'red')).toBe(true);
    });

    it('should handle mixed word and achievement unlocks in sequence', async () => {
      // Word unlock
      await unlockEngine.checkWordTriggers('red');
      await unlockEngine.checkWordTriggers('pirate');
      
      // Achievement unlock
      await unlockEngine.checkAchievementTriggers('beat_basicBot');
      
      const state = unlockEngine.getCurrentState();
      expect(state.themes).toContain('red');
      expect(state.bots).toContain('pirate-bot');
      expect(state.bots).toContain('easy-bot');
      expect(state.achievements).toContain('beat_basicBot');
    });

    it('should maintain state consistency across many operations', async () => {
      const words = ['red', 'blue', 'green', 'yellow', 'orange'];
      const achievements = ['beat_basicBot', 'beat_easy_bot', 'custom_achievement'];
      
      // Perform many unlock operations
      for (const word of words) {
        await unlockEngine.checkWordTriggers(word);
      }
      
      for (const achievement of achievements) {
        await unlockEngine.checkAchievementTriggers(achievement);
      }
      
      // Verify final state
      const state = unlockEngine.getCurrentState();
      expect(state.themes).toContain('red');
      expect(state.themes).toContain('blue');
      expect(state.themes).toContain('green');
      expect(state.themes).toContain('yellow');
      expect(state.themes).toContain('orange');
      
      expect(state.bots).toContain('easy-bot');
      expect(state.bots).toContain('medium-bot');
      
      expect(state.achievements).toContain('beat_basicBot');
      expect(state.achievements).toContain('beat_easy_bot');
      expect(state.achievements).toContain('custom_achievement');
    });
  });
}); 