/**
 * Enhanced Validation Test Suite
 * 
 * Tests the new descriptive error messages for invalid words across
 * all validation scenarios. This ensures that users get clear, 
 * actionable feedback when their word submissions are invalid.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalGameStateManagerWithDependencies } from './gamestate.js';
import { createTestDependencies } from './interfaces.js';

describe('Enhanced Validation System', () => {
  const testWords = [
    'CAT', 'CATS', 'DOG', 'DOGS', 'PLAY', 'PLAYS', 'WORD', 'WORDS',
    'GAME', 'GAMES', 'TEST', 'TESTS', 'HELLO', 'WORLD', 'BAT', 'BATS',
    // Add test words that will be used to test move validation (not real words)
    'CATSXY', 'CATSXYZ', 'C', 'CATSX', 'TACS', 'GAM'  
  ];

  const dependencies = createTestDependencies({
    validWords: testWords
  });

  let gameManager: LocalGameStateManagerWithDependencies;

  beforeEach(() => {
    gameManager = new LocalGameStateManagerWithDependencies(dependencies, {
      maxTurns: 10,
      initialWord: 'CATS',
      enableKeyLetters: false
    });
    gameManager.startGame();
  });

  describe('Dictionary Error Messages', () => {
    it('should return "not a word" for invalid dictionary words', () => {
      const result = gameManager.attemptMove('ZZZZZ');
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.reason).toBe('NOT_IN_DICTIONARY');
      expect(result.validationResult.userMessage).toBe('not a word');
    });

    it('should return "not a word" for nonsense words', () => {
      const nonsenseWords = ['QQQQ', 'XXXX', 'NOTAWORD', 'FAKEWRD'];
      
      nonsenseWords.forEach(word => {
        const result = gameManager.attemptMove(word);
        expect(result.isValid).toBe(false);
        expect(result.validationResult.userMessage).toBe('not a word');
      });
    });
  });

  describe('Already Played Error Messages', () => {
    it('should return "was played" for words already used in the game', () => {
      // First, play a word
      const firstMove = gameManager.attemptMove('CAT');
      expect(firstMove.isValid).toBe(true);
      gameManager.applyMove(firstMove);

      // Try to play the same word again
      const secondMove = gameManager.attemptMove('CAT');
      expect(secondMove.isValid).toBe(false);
      expect(secondMove.validationResult.userMessage).toBe('was played');
    });

    it('should track multiple played words correctly', () => {
      // Play several words with valid single-letter changes
      // CATS -> CAT (remove S) -> BAT (change C to B) 
      const moves = [
        { word: 'CAT', shouldSucceed: true },   // Remove S from CATS
        { word: 'BAT', shouldSucceed: true },   // Change C to B
        { word: 'BATS', shouldSucceed: true }   // Add S
      ];
      
      moves.forEach(({ word, shouldSucceed }) => {
        const move = gameManager.attemptMove(word);
        if (shouldSucceed && move.isValid) {
          gameManager.applyMove(move);
        }
      });

      // Try to replay each played word
      const playedWords = ['CATS', 'CAT', 'BAT']; // Including initial word
      playedWords.forEach(word => {
        const replay = gameManager.attemptMove(word);
        expect(replay.isValid).toBe(false);
        expect(replay.validationResult.userMessage).toBe('was played');
      });
    });

    it('should properly handle word repetition validation during game simulation', () => {
      // Test for the bug where valid words are incorrectly flagged as "was played"
      // Simulate the exact scenario from the terminal game
      
      // Start with CATS
      expect(gameManager.getState().currentWord).toBe('CATS');
      
      // Check initial usedWords state
      const initialUsedWords = gameManager.getState().usedWords;
      console.log('Initial used words:', initialUsedWords);
      
      // The problem words that should NOT be "was played"
      const problemWords = ['LOCK', 'CLOCK'];
      
      // First let's test if these words are in our test dictionary
      const testDeps = createTestDependencies({ validWords: ['CAT', 'CATS', 'DOG', 'DOGS', 'PLAY', 'PLAYS', 'WORD', 'WORDS', 'GAME', 'GAMES', 'TEST', 'TESTS', 'HELLO', 'WORLD', 'BAT', 'BATS', 'CATSXY', 'CATSXYZ', 'C', 'CATSX', 'TACS', 'GAM', 'LOCK', 'CLOCK'] });
      
      problemWords.forEach(word => {
        console.log(`\n=== Testing word: ${word} ===`);
        
        // Test with test dependencies first
        const testValidation = testDeps.validateWord(word);
        console.log(`- Test dict validation: valid=${testValidation.isValid}, message="${testValidation.userMessage}"`);
        
        // Test with actual game manager
        const attempt = gameManager.attemptMove(word);
        console.log(`- Game validation: valid=${attempt.isValid}, message="${attempt.validationResult.userMessage}"`);
        console.log(`- Used words: ${gameManager.getState().usedWords}`);
        
        // If the word is being rejected as "was played", check if it's actually in usedWords
        if (!attempt.isValid && attempt.validationResult.userMessage === 'was played') {
          const usedWords = gameManager.getState().usedWords;
          const isActuallyUsed = usedWords.includes(word);
          console.log(`- Word "${word}" is actually in usedWords: ${isActuallyUsed}`);
          
          // This should not happen - if the word wasn't actually played, it shouldn't be "was played"
          expect(isActuallyUsed).toBe(true); // If this fails, we found the bug
        }
      });
    });
  });

  describe('Move Rule Error Messages', () => {
    it('should return "illegal action" when adding more than 1 letter', () => {
      // Current word is CATS, try to add multiple letters
      const result = gameManager.attemptMove('CATSXY'); // Adding X and Y
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.reason).toBe('INVALID_MOVE');
      expect(result.validationResult.userMessage).toBe('illegal action');
    });

    it('should return "illegal action" when removing more than 1 letter', () => {
      // Start with a longer word and remove multiple letters
      // Use a test manager with a longer initial word
      const deps = createTestDependencies({ 
        validWords: ['TESTS', 'TEST', 'TES', 'CAT', 'CATS', 'DOG', 'DOGS'] 
      });
      const testManager = new LocalGameStateManagerWithDependencies(deps, {
        maxTurns: 10,
        initialWord: 'TESTS', // Start with 5-letter word
        enableKeyLetters: false
      });
      testManager.startGame();
      
      // Try to remove 2 letters: TESTS -> TES (removing T and S)
      const result = testManager.attemptMove('TES'); 
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.reason).toBe('INVALID_MOVE');
      expect(result.validationResult.userMessage).toBe('illegal action');
    });

    it('should allow valid single letter changes', () => {
      // Adding one letter should work
      const addResult = gameManager.attemptMove('CATSX'); // Adding X
      // Note: This might fail dictionary validation, but should pass move validation
      
      // Removing one letter should work  
      const removeResult = gameManager.attemptMove('CAT'); // Removing S
      expect(removeResult.isValid).toBe(true); // Should be valid
    });

    it('should allow rearrangement without limit', () => {
      // Rearranging letters should always be allowed
      const result = gameManager.attemptMove('TACS'); // Rearranging CATS
      // Note: This might fail dictionary validation, but should pass move validation
      
      if (!result.isValid && result.validationResult.userMessage) {
        // If it fails, it should be for dictionary reasons, not move rules
        expect(result.validationResult.userMessage).toBe('not a word');
      }
    });
  });

  describe('Character and Length Error Messages', () => {
    it('should return "only letters allowed" for words with numbers', () => {
      // Reset to a fresh state for character testing
      const deps = createTestDependencies({ validWords: ['CAT123'] }); // Allow the word in dictionary
      const testManager = new LocalGameStateManagerWithDependencies(deps, {
        maxTurns: 10,
        initialWord: 'CATS',
        enableKeyLetters: false
      });
      testManager.startGame();

      const result = testManager.attemptMove('CAT123');
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.reason).toBe('INVALID_CHARACTERS');
      expect(result.validationResult.userMessage).toBe('only letters allowed');
    });

    it('should return "only letters allowed" for words with symbols', () => {
      const result = gameManager.attemptMove('CAT!@#');
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.reason).toBe('INVALID_CHARACTERS');
      expect(result.validationResult.userMessage).toBe('only letters allowed');
    });

    it('should return "word cannot be empty" for empty words', () => {
      const result = gameManager.attemptMove('');
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.reason).toBe('EMPTY_WORD');
      expect(result.validationResult.userMessage).toBe('word cannot be empty');
    });

    it('should return "word too short" for words under 3 letters', () => {
      // Add short words to dictionary for testing
      const deps = createTestDependencies({ validWords: ['A', 'IT', 'TO'] });
      const testManager = new LocalGameStateManagerWithDependencies(deps, {
        maxTurns: 10,
        initialWord: 'CATS',
        enableKeyLetters: false
      });
      testManager.startGame();

      const shortWords = ['A', 'IT', 'TO'];
      
      shortWords.forEach(word => {
        const result = testManager.attemptMove(word);
        expect(result.isValid).toBe(false);
        expect(result.validationResult.reason).toBe('TOO_SHORT');
        expect(result.validationResult.userMessage).toBe('too short');
      });
    });
  });

  describe('System Error Messages', () => {
    it('should handle game state errors gracefully', () => {
      // Try to move when game is not playing
      gameManager.resetGame();
      // Don't start the game - it should be in 'waiting' state
      
      const result = gameManager.attemptMove('DOGS');
      
      expect(result.isValid).toBe(false);
      expect(result.validationResult.userMessage).toBe('game not active');
    });
  });

  describe('Error Message Consistency', () => {
    it('should always provide userMessage for invalid moves', () => {
      const testCases = [
        'ZZZZZ',      // not a word
        '',           // empty word
        'CAT123',     // invalid characters
        'A',          // too short
        'CATSXYZ'     // too many adds
      ];

      testCases.forEach(word => {
        const result = gameManager.attemptMove(word);
        expect(result.isValid).toBe(false);
        expect(result.validationResult.userMessage).toBeDefined();
        expect(result.validationResult.userMessage).not.toBe('');
        expect(typeof result.validationResult.userMessage).toBe('string');
      });
    });

    it('should provide structured reason codes for programmatic use', () => {
      const testCases = [
        { word: 'ZZZZZ', expectedReason: 'NOT_IN_DICTIONARY' },
        { word: '', expectedReason: 'EMPTY_WORD' },
        { word: 'CAT123', expectedReason: 'INVALID_CHARACTERS' },
        { word: 'A', expectedReason: 'TOO_SHORT' },
        { word: 'CATSXYZ', expectedReason: 'INVALID_MOVE' } // Move rule violations use generic INVALID_MOVE
      ];

      testCases.forEach(({ word, expectedReason }) => {
        const result = gameManager.attemptMove(word);
        expect(result.isValid).toBe(false);
        expect(result.validationResult.reason).toBe(expectedReason);
      });
    });

    it('should provide clear, user-friendly messages', () => {
      const result1 = gameManager.attemptMove('ZZZZZ');
      expect(result1.validationResult.userMessage).toBe('not a word');

      const result2 = gameManager.attemptMove('CAT123');
      expect(result2.validationResult.userMessage).toBe('only letters allowed');

      const result3 = gameManager.attemptMove('');
      expect(result3.validationResult.userMessage).toBe('word cannot be empty');

      // All messages should be lowercase and concise
      [result1, result2, result3].forEach(result => {
        const msg = result.validationResult.userMessage!;
        expect(msg.length).toBeLessThan(30); // Keep messages short
        expect(msg).toMatch(/^[a-z]/); // Start with lowercase
        expect(msg).not.toMatch(/[.!?]$/); // No ending punctuation
      });
    });
  });

  describe('Integration with Terminal Display', () => {
    it('should provide messages suitable for terminal display', () => {
      const testCases = [
        'NOTAWORD',   // Dictionary error
        'CATSXYZ',    // Too many adds
        'C',          // Too many removes
        'CAT123',     // Invalid characters
        ''            // Empty word
      ];

      testCases.forEach(word => {
        const result = gameManager.attemptMove(word);
        expect(result.isValid).toBe(false);
        
        const userMessage = result.validationResult.userMessage!;
        
        // Messages should be terminal-friendly
        expect(userMessage).toBeDefined();
        expect(userMessage.length).toBeGreaterThan(0);
        expect(userMessage.length).toBeLessThan(50); // Not too long for terminal
        expect(userMessage).not.toMatch(/\n/); // No line breaks
        expect(userMessage).not.toMatch(/[\t\r]/); // No special whitespace
      });
    });
  });
}); 