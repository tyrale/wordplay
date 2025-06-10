/**
 * Bug Reproduction Test
 * 
 * Tests the specific bug reported where "lock" and "clock" are incorrectly
 * flagged as "was played" when they haven't actually been played.
 * 
 * Game sequence from terminal:
 * Recent words: SOCK → COCKS → NOCKS → DOCKS → LOCKS
 * Current word: LOCKS
 * Attempted words: "lock", "clock" both return "was played" (BUG)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createNodeAdapter } from '../../src/adapters/nodeAdapter.js';
import { createGameStateManagerWithDependencies } from './gamestate.js';
import type { LocalGameStateManagerWithDependencies } from './gamestate.js';

describe('Bug Reproduction: False "was played" errors', () => {
  let gameManager: LocalGameStateManagerWithDependencies;
  
  beforeEach(async () => {
    // Use actual Node adapter like the terminal game does
    const nodeAdapter = await createNodeAdapter();
    const dependencies = nodeAdapter.getGameDependencies();
    
    gameManager = createGameStateManagerWithDependencies(dependencies, {
      maxTurns: 10,
      initialWord: 'CATS', // Start with a known word
      enableKeyLetters: false // Disable for simpler testing
    });
    gameManager.startGame();
  });

  it('should reproduce the exact "was played" bug from terminal', () => {
    console.log('=== REPRODUCING TERMINAL BUG ===');
    
    // Simulate the exact game sequence: SOCK → COCKS → NOCKS → DOCKS → LOCKS
    const gameSequence = [
      'SOCK',   // CATS → SOCK (major change, might fail)
      'COCKS',  // SOCK → COCKS (add C)
      'NOCKS',  // COCKS → NOCKS (change C to N)
      'DOCKS',  // NOCKS → DOCKS (change N to D)
      'LOCKS'   // DOCKS → LOCKS (change D to L)
    ];
    
    console.log('Initial state:');
    console.log('- Current word:', gameManager.getState().currentWord);
    console.log('- Used words:', gameManager.getState().usedWords);
    
    // Try to play the sequence
    gameSequence.forEach((word, index) => {
      console.log(`\nAttempting move ${index + 1}: ${word}`);
      const attempt = gameManager.attemptMove(word);
      console.log(`- Valid: ${attempt.isValid}`);
      console.log(`- Error: ${attempt.validationResult.userMessage}`);
      
      if (attempt.isValid && attempt.canApply) {
        const applied = gameManager.applyMove(attempt);
        console.log(`- Applied: ${applied}`);
        if (applied) {
          console.log(`- New current word: ${gameManager.getState().currentWord}`);
          console.log(`- Used words: ${gameManager.getState().usedWords}`);
        }
      }
    });
    
    // Now test the problematic words
    const problematicWords = ['lock', 'clock'];
    
    console.log('\n=== TESTING PROBLEMATIC WORDS ===');
    
    problematicWords.forEach(word => {
      console.log(`\nTesting: ${word.toUpperCase()}`);
      
      const usedWordsBefore = gameManager.getState().usedWords;
      console.log(`- Used words before test: [${usedWordsBefore.join(', ')}]`);
      console.log(`- Is "${word.toUpperCase()}" in used words? ${usedWordsBefore.includes(word.toUpperCase())}`);
      
      const attempt = gameManager.attemptMove(word);
      console.log(`- Validation result: isValid=${attempt.isValid}, message="${attempt.validationResult.userMessage}"`);
      
      // THE BUG: If word is flagged as "was played" but is NOT in usedWords, this is the bug
      if (!attempt.isValid && attempt.validationResult.userMessage === 'was played') {
        const isActuallyInUsedWords = usedWordsBefore.includes(word.toUpperCase());
        console.log(`- BUG DETECTED: "${word}" flagged as "was played" but is actually in used words: ${isActuallyInUsedWords}`);
        
        // This assertion should pass if the bug is fixed
        expect(isActuallyInUsedWords).toBe(true); // If this fails, we found the bug
      }
    });
  });
  
  it('should not have any false positives in word repetition detection', () => {
    // Simple test to verify basic word repetition logic
    
    // Play CAT → CATS
    const move1 = gameManager.attemptMove('CAT');
    if (move1.isValid) {
      gameManager.applyMove(move1);
    }
    
    const move2 = gameManager.attemptMove('CATS');
    if (move2.isValid) {
      gameManager.applyMove(move2);
    }
    
    // Now test some unplayed words
    const unplayedWords = ['DOG', 'BIRD', 'PLAY', 'GAME'];
    
    unplayedWords.forEach(word => {
      const attempt = gameManager.attemptMove(word);
      
      // These words should NOT be flagged as "was played"
      if (!attempt.isValid && attempt.validationResult.userMessage === 'was played') {
        console.log(`FALSE POSITIVE: "${word}" flagged as "was played"`);
        console.log(`Used words: ${gameManager.getState().usedWords}`);
        
        // This should not happen
        expect(true).toBe(false); // Force failure if we get a false positive
      }
    });
  });
}); 