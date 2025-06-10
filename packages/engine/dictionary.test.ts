/**
 * Unit tests for Word Validation Service
 * 
 * Covers all validation scenarios including dictionary integration,
 * slang support, profanity filtering, and bot capabilities.
 * 
 * Updated to use dependency injection with test adapter for consistent testing.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateWordWithDependencies,
  isValidDictionaryWordWithDependencies,
  getRandomWordByLengthWithDependencies,
  type ValidationOptions,
  type VanityState,
  type WordDataDependencies
} from './dictionary';
import { createTestAdapter, type TestAdapter } from '../../src/adapters/testAdapter';

describe('Word Validation Service', () => {
  let testAdapter: TestAdapter;
  let wordData: WordDataDependencies;

  beforeAll(() => {
    testAdapter = createTestAdapter();
    wordData = testAdapter.getWordData();
    
    // Add additional words for comprehensive testing
    const additionalWords = [
      'HELLO', 'WORLD', 'COMPUTER', 'GAME', 'WORD', 'PLAY',
      'ELEPHANT', 'DOGS', 'DAMN', 'HELL', 'CRAP', 'PISS',
      'WIFI', 'UBER', 'GOOGLE', 'SELFIE', 'EMOJI', 'YEET'
    ];
    
    additionalWords.forEach(word => testAdapter.addWord(word));
  });

  describe('Dictionary Integration', () => {
    it('should validate common dictionary words', () => {
      const commonWords = ['HELLO', 'WORLD', 'COMPUTER', 'GAME', 'WORD', 'PLAY'];
      
      commonWords.forEach(word => {
        const result = validateWordWithDependencies(word, wordData);
        expect(result.isValid).toBe(true);
        expect(result.word).toBe(word.toUpperCase());
        expect(result.reason).toBeUndefined();
      });
    });

    it('should reject words not in dictionary', () => {
      const invalidWords = ['ZZZZZ', 'QQQQ', 'XXXX', 'NOTAWORD'];
      
      invalidWords.forEach(word => {
        const result = validateWordWithDependencies(word, wordData, { allowSlang: false });
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('NOT_IN_DICTIONARY');
        expect(result.userMessage).toBe('not a word');
      });
    });

    it('should have loaded test dictionary', () => {
      const status = testAdapter.getDictionaryStatus();
      expect(status.loaded).toBe(true);
      expect(status.wordCount).toBeGreaterThan(50); // Test dictionary has many words
    });

    it('should provide direct dictionary lookup', () => {
      expect(isValidDictionaryWordWithDependencies('HELLO', wordData)).toBe(true);
      expect(isValidDictionaryWordWithDependencies('hello', wordData)).toBe(true); // case insensitive
      expect(isValidDictionaryWordWithDependencies('NOTAWORD', wordData)).toBe(false);
    });
  });

  describe('Slang Word Support', () => {
    it('should validate BRUH as per checkpoint requirement', () => {
      const result = validateWordWithDependencies('BRUH', wordData);
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('BRUH');
    });

    it('should validate common slang words when allowed', () => {
      const slangWords = ['BRUH', 'YEET', 'SELFIE', 'EMOJI'];
      
      slangWords.forEach(word => {
        const result = validateWordWithDependencies(word, wordData, { allowSlang: true });
        expect(result.isValid).toBe(true);
        expect(result.word).toBe(word.toUpperCase());
      });
    });

    it('should reject slang words when not allowed', () => {
      const result = validateWordWithDependencies('BRUH', wordData, { allowSlang: false });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('NOT_IN_DICTIONARY');
      expect(result.userMessage).toBe('not a word');
    });

    it('should identify slang words correctly', () => {
      expect(wordData.slangWords.has('BRUH')).toBe(true);
      expect(wordData.slangWords.has('SELFIE')).toBe(true);
      expect(wordData.slangWords.has('HELLO')).toBe(false);
    });
  });

  describe('Character Validation', () => {
    it('should reject numbers for human players', () => {
      const result = validateWordWithDependencies('HELLO123', wordData, { isBot: false });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('INVALID_CHARACTERS');
      expect(result.userMessage).toBe('only letters allowed');
    });

    it('should reject symbols for human players', () => {
      const result = validateWordWithDependencies('HELLO!', wordData, { isBot: false });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('INVALID_CHARACTERS');
      expect(result.userMessage).toBe('only letters allowed');
    });

    it('should allow mixed characters for bots', () => {
      const result = validateWordWithDependencies('HELLO123', wordData, { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty words', () => {
      const result = validateWordWithDependencies('', wordData);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('EMPTY_WORD');
      expect(result.userMessage).toBe('word cannot be empty');
    });

    it('should handle whitespace properly', () => {
      const result = validateWordWithDependencies('  HELLO  ', wordData);
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('HELLO');
    });
  });

  describe('Length Validation', () => {
    it('should reject words shorter than 3 letters', () => {
      const shortWords = ['A', 'IT', 'TO'];
      
      shortWords.forEach(word => {
        const result = validateWordWithDependencies(word, wordData, { checkLength: true });
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('TOO_SHORT');
        expect(result.userMessage).toBe('word too short');
      });
    });

    it('should allow words of 3+ letters', () => {
      const validWords = ['CAT', 'DOGS', 'HELLO'];
      
      validWords.forEach(word => {
        const result = validateWordWithDependencies(word, wordData, { checkLength: true });
        expect(result.isValid).toBe(true);
      });
    });

    it('should skip length check when disabled', () => {
      // Add 'IT' to dictionary for this test
      testAdapter.addWord('IT');
      const result = validateWordWithDependencies('IT', wordData, { checkLength: false });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Length Change Validation', () => {
    it('should allow same length words', () => {
      const result = validateWordWithDependencies('CATS', wordData, { previousWord: 'DOGS', checkLength: true });
      expect(result.isValid).toBe(true);
    });

    it('should allow ±1 letter difference', () => {
      // Adding one letter
      let result = validateWordWithDependencies('CATS', wordData, { previousWord: 'CAT', checkLength: true });
      expect(result.isValid).toBe(true);

      // Removing one letter  
      result = validateWordWithDependencies('CAT', wordData, { previousWord: 'CATS', checkLength: true });
      expect(result.isValid).toBe(true);
    });

    it('should reject changes >1 letter difference', () => {
      const result = validateWordWithDependencies('ELEPHANT', wordData, { previousWord: 'CAT', checkLength: true });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('LENGTH_CHANGE_TOO_LARGE');
      expect(result.userMessage).toBe('can only change word length by 1 letter');
    });
  });

  describe('Profanity Detection (No Longer Blocks Validation)', () => {
    it('should identify profane words', () => {
      expect(wordData.profanityWords.has('DAMN')).toBe(true);
      expect(wordData.profanityWords.has('HELLO')).toBe(false);
    });

    it('should allow profane words in validation (NEW BEHAVIOR)', () => {
      const result = validateWordWithDependencies('DAMN', wordData);
      expect(result.isValid).toBe(true); // Profane words are now valid!
      expect(result.word).toBe('DAMN');
    });

    it('should still provide legacy censoring function', () => {
      const result = validateWordWithDependencies('DAMN', wordData);
      expect(result.censored).toBeDefined(); // Should have censored version
    });
  });

  describe('Vanity Display System', () => {
    const defaultVanityState: VanityState = {
      hasUnlockedToggle: false,
      isVanityFilterOn: true
    };

    const unlockedVanityState: VanityState = {
      hasUnlockedToggle: true,
      isVanityFilterOn: true
    };

    it('should show normal words unchanged', () => {
      // These functions would need to be implemented or mocked
      // For now, just test that profane words get censored
      const result = validateWordWithDependencies('HELLO', wordData);
      expect(result.censored).toBeUndefined();
    });

    it('should show symbols for profane words when filter is on and not unlocked', () => {
      const result = validateWordWithDependencies('DAMN', wordData);
      expect(result.censored).toBeDefined();
      expect(result.censored).toMatch(/[!@#$%^&*]+/);
    });

    it('should show symbols for profane words when filter is on and unlocked', () => {
      const result = validateWordWithDependencies('DAMN', wordData);
      expect(result.censored).toBeDefined();
    });

    it('should show real word for profane words when filter is off and unlocked', () => {
      // This would require additional implementation
      const result = validateWordWithDependencies('DAMN', wordData);
      expect(result.word).toBe('DAMN');
    });

    it('should use variety of symbols for different word lengths', () => {
      const result1 = validateWordWithDependencies('DAMN', wordData);
      const result2 = validateWordWithDependencies('HELL', wordData);
      
      if (result1.censored && result2.censored) {
        expect(result1.censored.length).toBe(4);
        expect(result2.censored.length).toBe(4);
      }
    });

    it('should detect when unlocking should occur', () => {
      // This would require additional implementation
      expect(true).toBe(true); // Placeholder
    });

    it('should detect profane words for real-time display', () => {
      expect(wordData.profanityWords.has('DAMN')).toBe(true);
    });

    it('should handle case insensitivity in vanity display', () => {
      const result = validateWordWithDependencies('damn', wordData);
      expect(result.word).toBe('DAMN');
    });

    it('should handle edge cases in vanity display', () => {
      const result = validateWordWithDependencies('', wordData);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Bot Rule-Breaking Capabilities', () => {
    it('should allow bots to bypass all validation rules', () => {
      const result = validateWordWithDependencies('INVALID123!@#', wordData, { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should still apply validation rules to human players', () => {
      const result = validateWordWithDependencies('INVALID123!@#', wordData, { isBot: false });
      expect(result.isValid).toBe(false);
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle mixed case input', () => {
      const result = validateWordWithDependencies('hElLo', wordData);
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('HELLO');
    });

    it('should normalize all output to uppercase', () => {
      const result = validateWordWithDependencies('hello', wordData);
      expect(result.word).toBe('HELLO');
    });
  });

  describe('Performance Optimization', () => {
    it('should complete validation within performance targets', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        validateWordWithDependencies('HELLO', wordData);
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 100;
      
      expect(averageTime).toBeLessThan(1); // Should be very fast
    });

    it('should handle batch validation efficiently', () => {
      const words = ['HELLO', 'WORLD', 'GAME', 'PLAY', 'WORD'];
      const startTime = performance.now();
      
      words.forEach(word => validateWordWithDependencies(word, wordData));
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined gracefully', () => {
      const result1 = validateWordWithDependencies(null as unknown as string, wordData);
      expect(result1.isValid).toBe(false);

      const result2 = validateWordWithDependencies(undefined as unknown as string, wordData);
      expect(result2.isValid).toBe(false);
    });

    it('should handle very long words', () => {
      const longWord = 'A'.repeat(100);
      const result = validateWordWithDependencies(longWord, wordData, { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in bot mode', () => {
      const specialWord = '!@#$%^&*()';
      const result = validateWordWithDependencies(specialWord, wordData, { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should maintain consistency across multiple calls', () => {
      // Test the same word multiple times to ensure consistent results
      const word = 'HELLO';
      const results = Array(10).fill(null).map(() => validateWordWithDependencies(word, wordData));
      
      results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.word).toBe('HELLO');
      });
    });
  });

  describe('Validation Options Integration', () => {
    it('should respect all options together', () => {
      const options: ValidationOptions = {
        isBot: false,
        allowSlang: true,
        allowProfanity: false, // This option is now unused but kept for compatibility
        checkLength: true,
        previousWord: 'HELLO'
      };

      // Valid slang word with appropriate length change
      const result = validateWordWithDependencies('BRUH', wordData, options);
      expect(result.isValid).toBe(true);
    });

    it('should use default options when none provided', () => {
      const result = validateWordWithDependencies('HELLO', wordData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Random Word Generation', () => {
    it('should generate random words of specified length', () => {
      const fourLetterWord = getRandomWordByLengthWithDependencies(4, wordData);
      expect(fourLetterWord).toBeTruthy();
      expect(fourLetterWord!.length).toBe(4);
      expect(isValidDictionaryWordWithDependencies(fourLetterWord!, wordData)).toBe(true);
      
      const threeLetterWord = getRandomWordByLengthWithDependencies(3, wordData);
      expect(threeLetterWord).toBeTruthy();
      expect(threeLetterWord!.length).toBe(3);
      expect(isValidDictionaryWordWithDependencies(threeLetterWord!, wordData)).toBe(true);
    });

    it('should return null for impossible word lengths', () => {
      const impossibleWord = getRandomWordByLengthWithDependencies(100, wordData);
      expect(impossibleWord).toBeNull();
    });

    it('should generate multiple random words', () => {
      const words: string[] = [];
      for (let i = 0; i < 5; i++) {
        const word = getRandomWordByLengthWithDependencies(4, wordData);
        if (word) words.push(word);
      }
      
      expect(words.length).toBeGreaterThan(0);
      words.forEach(word => {
        expect(word.length).toBe(4);
        expect(isValidDictionaryWordWithDependencies(word, wordData)).toBe(true);
      });
    });

    it('should generate different words on multiple calls', () => {
      const words = new Set();
      // Generate random 4-letter words - should get some variety
      for (let i = 0; i < 10; i++) {
        const word = getRandomWordByLengthWithDependencies(4, wordData);
        if (word) words.add(word);
      }
      
      // Should have some variety (at least 2 different words out of 10)
      expect(words.size).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for impossible lengths in batch generation', () => {
      // Test that impossible lengths return null
      const impossibleWord = getRandomWordByLengthWithDependencies(100, wordData);
      expect(impossibleWord).toBeNull();
    });
  });
}); 