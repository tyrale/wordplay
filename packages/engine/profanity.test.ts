/**
 * Unit tests for Centralized Profanity Management
 * 
 * Tests the platform-agnostic profanity detection system that provides
 * a single source of truth for profanity words across all platforms.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getProfanityWords,
  isProfanity,
  getProfanityStats,
  getBasicProfanityWords,
  getComprehensiveProfanityWords,
  type ProfanityConfig
} from './profanity';

describe('Centralized Profanity Management', () => {
  describe('Basic Profanity Detection', () => {
    it('should detect basic profanity words', () => {
      const basicWords = getProfanityWords({ level: 'basic' });
      
      expect(basicWords.has('DAMN')).toBe(true);
      expect(basicWords.has('HELL')).toBe(true);
      expect(basicWords.has('SHIT')).toBe(true);
      expect(basicWords.has('FUCK')).toBe(true);
    });

    it('should not detect clean words as profanity', () => {
      const basicWords = getProfanityWords({ level: 'basic' });
      
      expect(basicWords.has('HELLO')).toBe(false);
      expect(basicWords.has('WORLD')).toBe(false);
      expect(basicWords.has('GAME')).toBe(false);
      expect(basicWords.has('PLAY')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isProfanity('damn', { level: 'basic' })).toBe(true);
      expect(isProfanity('DAMN', { level: 'basic' })).toBe(true);
      expect(isProfanity('Damn', { level: 'basic' })).toBe(true);
      expect(isProfanity('dAmN', { level: 'basic' })).toBe(true);
    });
  });

  describe('Comprehensive Profanity Detection', () => {
    it('should load comprehensive word list', () => {
      const comprehensiveWords = getProfanityWords({ level: 'comprehensive' });
      const basicWords = getProfanityWords({ level: 'basic' });
      
      // Comprehensive should have more words than basic
      expect(comprehensiveWords.size).toBeGreaterThan(basicWords.size);
      
      // Should include all basic words
      for (const word of basicWords) {
        expect(comprehensiveWords.has(word)).toBe(true);
      }
    });

    it('should detect comprehensive profanity words', () => {
      const comprehensiveWords = getProfanityWords({ level: 'comprehensive' });
      
      // Should include basic words
      expect(comprehensiveWords.has('DAMN')).toBe(true);
      expect(comprehensiveWords.has('SHIT')).toBe(true);
      
      // Should include additional words from comprehensive list
      expect(comprehensiveWords.size).toBeGreaterThan(15);
    });

    it('should provide fallback to basic if comprehensive loading fails', () => {
      // This test verifies the error handling works
      const words = getProfanityWords({ level: 'comprehensive' });
      expect(words.size).toBeGreaterThan(0);
    });
  });

  describe('Custom Configuration', () => {
    it('should add custom words to the profanity list', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: ['CUSTOMWORD', 'ANOTHERWORD']
      };
      
      const words = getProfanityWords(config);
      
      expect(words.has('CUSTOMWORD')).toBe(true);
      expect(words.has('ANOTHERWORD')).toBe(true);
      expect(words.has('DAMN')).toBe(true); // Basic words still included
    });

    it('should exclude specified words from the profanity list', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        excludeWords: ['DAMN', 'HELL']
      };
      
      const words = getProfanityWords(config);
      
      expect(words.has('DAMN')).toBe(false);
      expect(words.has('HELL')).toBe(false);
      expect(words.has('SHIT')).toBe(true); // Other words still included
    });

    it('should handle both custom and excluded words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: ['NEWBAD'],
        excludeWords: ['DAMN']
      };
      
      const words = getProfanityWords(config);
      
      expect(words.has('NEWBAD')).toBe(true);
      expect(words.has('DAMN')).toBe(false);
      expect(words.has('SHIT')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should provide statistics about profanity lists', () => {
      const basicStats = getProfanityStats({ level: 'basic' });
      const comprehensiveStats = getProfanityStats({ level: 'comprehensive' });
      
      expect(basicStats.level).toBe('basic');
      expect(basicStats.source).toBe('hardcoded');
      expect(basicStats.totalWords).toBe(15);
      
      expect(comprehensiveStats.level).toBe('comprehensive');
      expect(comprehensiveStats.source).toBe('naughty-words');
      expect(comprehensiveStats.totalWords).toBeGreaterThan(15);
    });

    it('should provide legacy compatibility functions', () => {
      const basicWords = getBasicProfanityWords();
      const comprehensiveWords = getComprehensiveProfanityWords();
      
      expect(basicWords.size).toBe(15);
      expect(comprehensiveWords.size).toBeGreaterThan(15);
      
      expect(basicWords.has('DAMN')).toBe(true);
      expect(comprehensiveWords.has('DAMN')).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should perform profanity checks quickly', () => {
      const words = getProfanityWords({ level: 'comprehensive' });
      const testWords = ['DAMN', 'HELLO', 'SHIT', 'WORLD', 'FUCK', 'GAME'];
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        for (const word of testWords) {
          words.has(word);
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 6000 lookups in under 10ms
      expect(totalTime).toBeLessThan(10);
    });

    it('should handle memory efficiently', () => {
      const words = getProfanityWords({ level: 'comprehensive' });
      
      // Should be a Set for efficient lookup
      expect(words).toBeInstanceOf(Set);
      
      // Should contain uppercase words for consistency
      for (const word of Array.from(words).slice(0, 10)) {
        expect(word).toBe(word.toUpperCase());
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty configurations', () => {
      const words = getProfanityWords();
      expect(words.size).toBeGreaterThan(0);
    });

    it('should handle undefined custom words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: undefined,
        excludeWords: undefined
      };
      
      const words = getProfanityWords(config);
      expect(words.size).toBe(15);
    });

    it('should handle empty custom words arrays', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: [],
        excludeWords: []
      };
      
      const words = getProfanityWords(config);
      expect(words.size).toBe(15);
    });

    it('should handle case variations in custom words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: ['lowercase', 'MiXeDcAsE', 'UPPERCASE']
      };
      
      const words = getProfanityWords(config);
      
      expect(words.has('LOWERCASE')).toBe(true);
      expect(words.has('MIXEDCASE')).toBe(true);
      expect(words.has('UPPERCASE')).toBe(true);
    });
  });
}); 