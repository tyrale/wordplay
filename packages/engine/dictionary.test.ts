/**
 * Unit tests for Word Validation Service
 * 
 * Covers all validation scenarios including ENABLE dictionary,
 * slang support, profanity filtering, and bot capabilities.
 */

import { describe, it, expect } from 'vitest';
import {
  validateWord,
  isValidDictionaryWord,
  isSlangWord,
  containsProfanity,
  censorProfanity,
  getDictionarySize,
  performanceTest,
  getVanityDisplayWord,
  shouldUnlockVanityToggle,
  isCurrentWordProfane,
  getRandomWordByLength,
  getRandomWordsByLength,
  type ValidationOptions,
  type VanityState
} from './dictionary';

describe('Word Validation Service', () => {
  
  describe('ENABLE Dictionary Integration', () => {
    it('should validate common ENABLE words', () => {
      const commonWords = ['HELLO', 'WORLD', 'COMPUTER', 'GAME', 'WORD', 'PLAY'];
      
      commonWords.forEach(word => {
        const result = validateWord(word);
        expect(result.isValid).toBe(true);
        expect(result.word).toBe(word.toUpperCase());
        expect(result.reason).toBeUndefined();
      });
    });

    it('should reject words not in ENABLE dictionary', () => {
      const invalidWords = ['ZZZZZ', 'QQQQ', 'XXXX', 'NOTAWORD'];
      
      invalidWords.forEach(word => {
        const result = validateWord(word, { allowSlang: false });
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Word not found in dictionary');
      });
    });

    it('should have loaded a substantial dictionary', () => {
      const size = getDictionarySize();
      expect(size).toBeGreaterThan(170000); // ENABLE has ~172k words
    });

    it('should provide direct dictionary lookup', () => {
      expect(isValidDictionaryWord('HELLO')).toBe(true);
      expect(isValidDictionaryWord('hello')).toBe(true); // case insensitive
      expect(isValidDictionaryWord('NOTAWORD')).toBe(false);
    });
  });

  describe('Slang Word Support', () => {
    it('should validate BRUH as per checkpoint requirement', () => {
      const result = validateWord('BRUH');
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('BRUH');
    });

    it('should validate common slang words when allowed', () => {
      const slangWords = ['BRUH', 'YEET', 'SELFIE', 'EMOJI', 'WIFI', 'UBER', 'GOOGLE'];
      
      slangWords.forEach(word => {
        const result = validateWord(word, { allowSlang: true });
        expect(result.isValid).toBe(true);
        expect(result.word).toBe(word.toUpperCase());
      });
    });

    it('should reject slang words when not allowed', () => {
      const result = validateWord('BRUH', { allowSlang: false });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Word not found in dictionary');
    });

    it('should identify slang words correctly', () => {
      expect(isSlangWord('BRUH')).toBe(true);
      expect(isSlangWord('SELFIE')).toBe(true);
      expect(isSlangWord('HELLO')).toBe(false);
    });
  });

  describe('Character Validation', () => {
    it('should reject numbers for human players', () => {
      const result = validateWord('HELLO123', { isBot: false });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Word must contain only alphabetic characters');
    });

    it('should reject symbols for human players', () => {
      const result = validateWord('HELLO!', { isBot: false });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Word must contain only alphabetic characters');
    });

    it('should allow mixed characters for bots', () => {
      const result = validateWord('HELLO123', { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty words', () => {
      const result = validateWord('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Word cannot be empty');
    });

    it('should handle whitespace properly', () => {
      const result = validateWord('  HELLO  ');
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('HELLO');
    });
  });

  describe('Length Validation', () => {
    it('should reject words shorter than 3 letters', () => {
      const shortWords = ['A', 'IT', 'TO'];
      
      shortWords.forEach(word => {
        const result = validateWord(word, { checkLength: true });
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Word must be at least 3 letters long');
      });
    });

    it('should allow words of 3+ letters', () => {
      const validWords = ['CAT', 'DOGS', 'HELLO'];
      
      validWords.forEach(word => {
        const result = validateWord(word, { checkLength: true });
        expect(result.isValid).toBe(true);
      });
    });

    it('should skip length check when disabled', () => {
      const result = validateWord('IT', { checkLength: false });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Length Change Validation', () => {
    it('should allow same length words', () => {
      const result = validateWord('CATS', { previousWord: 'DOGS', checkLength: true });
      expect(result.isValid).toBe(true);
    });

    it('should allow ±1 letter difference', () => {
      // Adding one letter
      let result = validateWord('CATS', { previousWord: 'CAT', checkLength: true });
      expect(result.isValid).toBe(true);

      // Removing one letter  
      result = validateWord('CAT', { previousWord: 'CATS', checkLength: true });
      expect(result.isValid).toBe(true);
    });

    it('should reject changes >1 letter difference', () => {
      const result = validateWord('ELEPHANT', { previousWord: 'CAT', checkLength: true });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Word length can only change by ±1 letter per turn');
    });
  });

  describe('Profanity Detection (No Longer Blocks Validation)', () => {
    it('should identify profane words', () => {
      expect(containsProfanity('DAMN')).toBe(true);
      expect(containsProfanity('HELLO')).toBe(false);
    });

    it('should allow profane words in validation (NEW BEHAVIOR)', () => {
      const result = validateWord('DAMN');
      expect(result.isValid).toBe(true); // Profane words are now valid!
      expect(result.word).toBe('DAMN');
    });

    it('should still provide legacy censoring function', () => {
      const censored = censorProfanity('DAMN');
      expect(censored).toBe('D**N'); // Legacy function still works
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

    const unlockedFilterOffState: VanityState = {
      hasUnlockedToggle: true,
      isVanityFilterOn: false
    };

    it('should show normal words unchanged', () => {
      const displayWord = getVanityDisplayWord('HELLO', { vanityState: defaultVanityState });
      expect(displayWord).toBe('HELLO');
    });

    it('should show symbols for profane words when filter is on and not unlocked', () => {
      const displayWord = getVanityDisplayWord('DAMN', { vanityState: defaultVanityState });
      expect(displayWord).toBe('%#^&'); // 4 symbols for 4-letter word
    });

    it('should show symbols for profane words when filter is on and unlocked', () => {
      const displayWord = getVanityDisplayWord('DAMN', { vanityState: unlockedVanityState });
      expect(displayWord).toBe('%#^&');
    });

    it('should show real word for profane words when filter is off and unlocked', () => {
      const displayWord = getVanityDisplayWord('DAMN', { vanityState: unlockedFilterOffState });
      expect(displayWord).toBe('DAMN');
    });

    it('should use variety of symbols for different word lengths', () => {
      const shortWord = getVanityDisplayWord('ASS', { vanityState: defaultVanityState });
      const longWord = getVanityDisplayWord('ASSHOLE', { vanityState: defaultVanityState });
      
      expect(shortWord).toBe('%#^'); // 3 symbols
      expect(longWord).toBe('%#^&*@!'); // 7 symbols
    });

    it('should detect when unlocking should occur', () => {
      expect(shouldUnlockVanityToggle('DAMN')).toBe(true);
      expect(shouldUnlockVanityToggle('HELLO')).toBe(false);
    });

    it('should detect profane words for real-time display', () => {
      expect(isCurrentWordProfane('DAMN')).toBe(true);
      expect(isCurrentWordProfane('HELLO')).toBe(false);
    });

    it('should handle case insensitivity in vanity display', () => {
      const displayWord = getVanityDisplayWord('damn', { vanityState: defaultVanityState });
      expect(displayWord).toBe('%#^&');
    });

    it('should handle edge cases in vanity display', () => {
      // Empty string
      const empty = getVanityDisplayWord('', { vanityState: defaultVanityState });
      expect(empty).toBe('');

      // Single character profane (if it existed)
      const single = getVanityDisplayWord('A', { vanityState: defaultVanityState });
      expect(single).toBe('A'); // Not profane
    });
  });

  describe('Bot Rule-Breaking Capabilities', () => {
    it('should allow bots to bypass all validation rules', () => {
      // Invalid characters
      let result = validateWord('HELLO123!@#', { isBot: true });
      expect(result.isValid).toBe(true);

      // Non-dictionary words
      result = validateWord('XYZQWERTY', { isBot: true });
      expect(result.isValid).toBe(true);

      // Short words
      result = validateWord('X', { isBot: true, checkLength: true });
      expect(result.isValid).toBe(true);

      // Large length changes
      result = validateWord('SUPERCALIFRAGILISTICEXPIALIDOCIOUS', { 
        isBot: true, 
        previousWord: 'CAT',
        checkLength: true 
      });
      expect(result.isValid).toBe(true);
    });

    it('should still apply validation rules to human players', () => {
      const result = validateWord('HELLO123', { isBot: false });
      expect(result.isValid).toBe(false);
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle mixed case input', () => {
      const testCases = ['hello', 'HELLO', 'Hello', 'hELLo', 'HeLLo'];
      
      testCases.forEach(word => {
        const result = validateWord(word);
        expect(result.isValid).toBe(true);
        expect(result.word).toBe('HELLO');
      });
    });

    it('should normalize all output to uppercase', () => {
      const result = validateWord('bruh');
      expect(result.word).toBe('BRUH');
    });
  });

  describe('Performance Optimization', () => {
    it('should complete validation within performance targets', () => {
      const { averageTime } = performanceTest(100);
      
      // Should average less than 1ms per validation
      expect(averageTime).toBeLessThan(1);
    });

    it('should handle batch validation efficiently', () => {
      const baseWords = ['HELLO', 'WORLD', 'GAME', 'WORD', 'PLAY'];
      const words = Array(100).fill(baseWords).flat();
      const startTime = performance.now();
      
      words.forEach(word => validateWord(word));
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should process 500 words in under 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined gracefully', () => {
      const result1 = validateWord(null as any);
      expect(result1.isValid).toBe(false);

      const result2 = validateWord(undefined as any);
      expect(result2.isValid).toBe(false);
    });

    it('should handle very long words', () => {
      const longWord = 'A'.repeat(100);
      const result = validateWord(longWord, { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in bot mode', () => {
      const specialWord = '!@#$%^&*()';
      const result = validateWord(specialWord, { isBot: true });
      expect(result.isValid).toBe(true);
    });

    it('should maintain consistency across multiple calls', () => {
      // Test the same word multiple times to ensure consistent results
      const word = 'HELLO';
      const results = Array(10).fill(null).map(() => validateWord(word));
      
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
      const result = validateWord('BRUH', options);
      expect(result.isValid).toBe(true);
    });

    it('should use default options when none provided', () => {
      const result = validateWord('HELLO');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Random Word Generation', () => {
    it('should generate random words of specified length', () => {
      const fourLetterWord = getRandomWordByLength(4);
      expect(fourLetterWord).toBeTruthy();
      expect(fourLetterWord!.length).toBe(4);
      expect(isValidDictionaryWord(fourLetterWord!)).toBe(true);
      
      const threeLetterWord = getRandomWordByLength(3);
      expect(threeLetterWord).toBeTruthy();
      expect(threeLetterWord!.length).toBe(3);
      expect(isValidDictionaryWord(threeLetterWord!)).toBe(true);
    });

    it('should return null for impossible word lengths', () => {
      const impossibleWord = getRandomWordByLength(100);
      expect(impossibleWord).toBeNull();
    });

    it('should generate multiple random words', () => {
      const words = getRandomWordsByLength(4, 5);
      expect(words).toHaveLength(5);
      
      words.forEach(word => {
        expect(word.length).toBe(4);
        expect(isValidDictionaryWord(word)).toBe(true);
      });
    });

    it('should generate different words on multiple calls', () => {
      const words = new Set();
      // Generate 20 random 4-letter words - should get some variety
      for (let i = 0; i < 20; i++) {
        const word = getRandomWordByLength(4);
        if (word) words.add(word);
      }
      
      // Should have some variety (at least 5 different words out of 20)
      expect(words.size).toBeGreaterThanOrEqual(5);
    });

    it('should return empty array for impossible lengths in batch generation', () => {
      const words = getRandomWordsByLength(100, 3);
      expect(words).toHaveLength(0);
    });
  });
}); 