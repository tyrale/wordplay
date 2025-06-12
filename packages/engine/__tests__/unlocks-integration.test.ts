/**
 * Unlock Engine Integration Tests
 * 
 * Simple integration tests to verify the unlock system works
 * for the main use cases described in the requirements.
 */

import { describe, it, expect } from 'vitest';
import { createUnlockEngine } from '../unlocks';
import { createTestUnlockDependencies } from '../../adapters/test/unlocks';

describe('Unlock Engine Integration', () => {
  it('should unlock red theme when playing "red" and apply it immediately', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // Initially red theme should not be unlocked
    expect(engine.isUnlocked('theme', 'red')).toBe(false);
    
    // Play the word "red"
    const results = await engine.checkWordTriggers('red');
    
    // Should unlock red theme with immediate effect
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      category: 'theme',
      target: 'red',
      wasAlreadyUnlocked: false,
      immediateEffect: { type: 'apply_theme', value: 'red' }
    });
    
    // Red theme should now be unlocked
    expect(engine.isUnlocked('theme', 'red')).toBe(true);
  });

  it('should unlock five-letter mechanic when playing "five"', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // Initially mechanic should not be unlocked
    expect(engine.isUnlocked('mechanic', '5-letter-start')).toBe(false);
    
    // Play the word "five"
    const results = await engine.checkWordTriggers('five');
    
    // Should unlock 5-letter-start mechanic
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      category: 'mechanic',
      target: '5-letter-start',
      wasAlreadyUnlocked: false
    });
    
    // Mechanic should now be unlocked
    expect(engine.isUnlocked('mechanic', '5-letter-start')).toBe(true);
  });

  it('should unlock easy bot when beating tester bot', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // Initially easy bot should not be unlocked
    expect(engine.isUnlocked('bot', 'easy-bot')).toBe(false);
    
    // Beat the tester bot
    const results = await engine.checkAchievementTriggers('beat_tester');
    
    // Should unlock easy bot
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      category: 'bot',
      target: 'easy-bot',
      wasAlreadyUnlocked: false
    });
    
    // Easy bot should now be unlocked
    expect(engine.isUnlocked('bot', 'easy-bot')).toBe(true);
    
    // Achievement should be tracked
    const state = engine.getCurrentState();
    expect(state.achievements).toContain('beat_tester');
  });

  it('should unlock pirate bot when playing "pirate"', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // Initially pirate bot should not be unlocked
    expect(engine.isUnlocked('bot', 'pirate-bot')).toBe(false);
    
    // Play the word "pirate"
    const results = await engine.checkWordTriggers('pirate');
    
    // Should unlock pirate bot
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      category: 'bot',
      target: 'pirate-bot',
      wasAlreadyUnlocked: false
    });
    
    // Pirate bot should now be unlocked
    expect(engine.isUnlocked('bot', 'pirate-bot')).toBe(true);
  });

  it('should handle multiple unlocks in sequence', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // Start with initial state
    const initialState = engine.getCurrentState();
    expect(initialState.themes).toEqual(['classic blue']);
    expect(initialState.bots).toEqual(['tester']);
    expect(initialState.mechanics).toEqual([]);
    
    // Unlock some themes
    await engine.checkWordTriggers('red');
    await engine.checkWordTriggers('blue');
    await engine.checkWordTriggers('green');
    
    // Unlock some mechanics
    await engine.checkWordTriggers('five');
    await engine.checkWordTriggers('six');
    
    // Unlock some bots
    await engine.checkWordTriggers('pirate');
    await engine.checkAchievementTriggers('beat_tester');
    
    // Verify final state
    const finalState = engine.getCurrentState();
    expect(finalState.themes).toContain('red');
    expect(finalState.themes).toContain('blue');
    expect(finalState.themes).toContain('green');
    expect(finalState.mechanics).toContain('5-letter-start');
    expect(finalState.mechanics).toContain('6-letter-start');
    expect(finalState.bots).toContain('pirate-bot');
    expect(finalState.bots).toContain('easy-bot');
    expect(finalState.achievements).toContain('beat_tester');
  });

  it('should not unlock already unlocked items', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // First unlock
    const firstResults = await engine.checkWordTriggers('red');
    expect(firstResults).toHaveLength(1);
    expect(engine.isUnlocked('theme', 'red')).toBe(true);
    
    // Second attempt should return no results
    const secondResults = await engine.checkWordTriggers('red');
    expect(secondResults).toHaveLength(0);
    
    // State should remain the same
    expect(engine.isUnlocked('theme', 'red')).toBe(true);
  });

  it('should handle case-insensitive word matching', async () => {
    const dependencies = createTestUnlockDependencies();
    const engine = createUnlockEngine(dependencies);
    
    // Test different cases
    const results1 = await engine.checkWordTriggers('RED');
    const results2 = await engine.checkWordTriggers('Blue');
    const results3 = await engine.checkWordTriggers('GREEN');
    
    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results3).toHaveLength(1);
    
    expect(engine.isUnlocked('theme', 'red')).toBe(true);
    expect(engine.isUnlocked('theme', 'blue')).toBe(true);
    expect(engine.isUnlocked('theme', 'green')).toBe(true);
  });
}); 