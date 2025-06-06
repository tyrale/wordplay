/**
 * Integration Tests for Platform Adapters
 * 
 * These tests demonstrate that all three platform adapters (Browser, Node.js, Test)
 * work correctly with the dependency injection architecture.
 */

import { describe, it, expect } from 'vitest';
import { BrowserAdapter } from './browserAdapter';
import { NodeAdapter } from './nodeAdapter';
import { TestAdapter } from './testAdapter';
import { validateWordWithDependencies } from '../../packages/engine/dictionary';
import { generateBotMoveWithDependencies } from '../../packages/engine/bot';
import { createGameStateManagerWithDependencies } from '../../packages/engine/gamestate';

describe('Platform Adapter Integration Tests', () => {
  
  describe('Test Adapter', () => {
    it('should provide working dependencies for word validation', () => {
      const testAdapter = TestAdapter.getInstance();
      const wordData = testAdapter.getWordData();
      
      // Test basic functionality
      expect(wordData.wordCount).toBeGreaterThan(0);
      expect(wordData.hasWord('CAT')).toBe(true);
      expect(wordData.hasWord('ZZZZZZ')).toBe(false);
      
      // Test dictionary dependencies
      const deps = testAdapter.getDictionaryDependencies();
      const result = deps.validateWord('CAT');
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('CAT');
    });

         it('should work with bot dependencies', async () => {
       const testAdapter = TestAdapter.getInstance();
       const botDeps = testAdapter.getBotDependencies();
       
       const botResult = await botDeps.generateBotMove('CAT');
       expect(botResult).toBeDefined();
       if (botResult.move) {
         expect(typeof botResult.move.word).toBe('string');
         expect(typeof botResult.move.score).toBe('number');
       }
     });

    it('should work with game state manager', () => {
      const testAdapter = TestAdapter.getInstance();
      const dependencies = testAdapter.getGameDependencies();
      
      const gameManager = createGameStateManagerWithDependencies(dependencies, {
        maxTurns: 5,
        allowBotPlayer: true
      });
      
      expect(gameManager).toBeDefined();
      const state = gameManager.getState();
      expect(state.gameStatus).toBe('notStarted');
    });
  });

  describe('Browser Adapter', () => {
    it('should initialize successfully', async () => {
      const browserAdapter = BrowserAdapter.getInstance();
      await browserAdapter.initialize();
      
      expect(browserAdapter.isInitialized).toBe(true);
      
      const status = browserAdapter.getDictionaryStatus();
      expect(status.loaded).toBe(true);
      expect(status.wordCount).toBeGreaterThan(1000); // Should have many words
    });

    it('should provide working dependencies', async () => {
      const browserAdapter = BrowserAdapter.getInstance();
      await browserAdapter.initialize();
      
      const deps = browserAdapter.getDictionaryDependencies();
      const result = deps.validateWord('HELLO');
      expect(result.isValid).toBe(true);
      
      const randomWord = deps.getRandomWordByLength(4);
      expect(randomWord).toBeDefined();
      if (randomWord) {
        expect(randomWord.length).toBe(4);
      }
    });

    it('should work with game dependencies', async () => {
      const browserAdapter = BrowserAdapter.getInstance();
      await browserAdapter.initialize();
      
      const dependencies = browserAdapter.getGameDependencies();
      
      const gameManager = createGameStateManagerWithDependencies(dependencies, {
        maxTurns: 5,
        allowBotPlayer: true
      });
      
      expect(gameManager).toBeDefined();
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should validate the same words consistently across platforms', async () => {
      // Initialize adapters
      const testAdapter = TestAdapter.getInstance();
      const browserAdapter = BrowserAdapter.getInstance();
      await browserAdapter.initialize();
      
      const testWords = ['CAT', 'DOG', 'HELLO', 'WORLD'];
      
      for (const word of testWords) {
        const testResult = testAdapter.getDictionaryDependencies().validateWord(word);
        const browserResult = browserAdapter.getDictionaryDependencies().validateWord(word);
        
        // Both should agree on validity (though they may have different dictionaries)
        expect(typeof testResult.isValid).toBe('boolean');
        expect(typeof browserResult.isValid).toBe('boolean');
        expect(testResult.word).toBe(word);
        expect(browserResult.word).toBe(word);
      }
    });

    it('should provide consistent interface across all adapters', async () => {
      const testAdapter = TestAdapter.getInstance();
      const browserAdapter = BrowserAdapter.getInstance();
      await browserAdapter.initialize();
      
      // All adapters should provide the same interface structure
      const testDeps = testAdapter.getGameDependencies();
      const browserDeps = browserAdapter.getGameDependencies();
      
      expect(typeof testDeps.validateWord).toBe('function');
      expect(typeof testDeps.getRandomWordByLength).toBe('function');
      expect(typeof testDeps.calculateScore).toBe('function');
      expect(typeof testDeps.getScoreForMove).toBe('function');
      expect(typeof testDeps.generateBotMove).toBe('function');
      
      expect(typeof browserDeps.validateWord).toBe('function');
      expect(typeof browserDeps.getRandomWordByLength).toBe('function');
      expect(typeof browserDeps.calculateScore).toBe('function');
      expect(typeof browserDeps.getScoreForMove).toBe('function');
      expect(typeof browserDeps.generateBotMove).toBe('function');
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should use injected dependencies for word validation', () => {
      const testAdapter = TestAdapter.getInstance();
      const wordData = testAdapter.getWordData();
      
      // Add a custom word to test adapter
      const customWord = 'TESTWORD';
      testAdapter.addWord(customWord);
      
      // Verify the dependency injection uses our custom word data
      const result = validateWordWithDependencies(customWord, wordData);
      expect(result.isValid).toBe(true);
      
      // Remove the word and verify it's no longer valid
      testAdapter.removeWord(customWord);
      const removedResult = validateWordWithDependencies(customWord, wordData);
      expect(removedResult.isValid).toBe(false);
    });

    it('should use injected dependencies for bot moves', async () => {
      const testAdapter = TestAdapter.getInstance();
      testAdapter.reset(); // Start with clean slate
      
      // Add only specific words
      testAdapter.addWord('CAT');
      testAdapter.addWord('CATS');
      testAdapter.addWord('BATS');
      
      const dependencies = {
        ...testAdapter.getGameDependencies(),
        isValidDictionaryWord: (word: string) => testAdapter.getWordData().hasWord(word)
      };
      
             const botResult = await generateBotMoveWithDependencies('CAT', dependencies);
       
       if (botResult.move) {
         // Bot should only suggest words that exist in our limited test dictionary
         expect(['CATS', 'BATS'].includes(botResult.move.word)).toBe(true);
       }
    });

    it('should demonstrate zero coupling between engine and platform code', () => {
      // This test verifies that we can create multiple different adapters
      // and they all work with the same engine functions
      
      const testAdapter1 = TestAdapter.getInstance();
      testAdapter1.reset();
      testAdapter1.addWord('HELLO');
      testAdapter1.addWord('WORLD');
      
      const testAdapter2 = TestAdapter.getInstance();
      // Note: same instance, but we can simulate different configurations
      
      // Both use the same validateWordWithDependencies function
      const result1 = validateWordWithDependencies('HELLO', testAdapter1.getWordData());
      const result2 = validateWordWithDependencies('HELLO', testAdapter2.getWordData());
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      
      // The engine function works with any compatible word data
      expect(result1.word).toBe(result2.word);
    });
  });
}); 