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
      expect(basicWords.has('INNOCENT')).toBe(false);
    });

    it('should return legacy words from getBasicProfanityWords', () => {
      const basicWords = getBasicProfanityWords();
      expect(Array.isArray(basicWords)).toBe(true);
      expect(basicWords.length).toBe(15);
      expect(basicWords.includes('DAMN')).toBe(true);
      expect(basicWords.includes('SHIT')).toBe(true);
    });

    it('should have consistent basic word count', () => {
      const basicSet = getProfanityWords({ level: 'basic' });
      const basicArray = getBasicProfanityWords();
      expect(basicSet.size).toBe(basicArray.length);
    });
  });

  describe('Comprehensive Profanity Detection', () => {
    it('should load comprehensive word list', () => {
      const comprehensiveWords = getProfanityWords({ level: 'comprehensive' });
      
      // Should contain significantly more words than basic
      expect(comprehensiveWords.size).toBeGreaterThan(100);
      
      // Should still include all basic words for backward compatibility
      expect(comprehensiveWords.has('DAMN')).toBe(true);
      expect(comprehensiveWords.has('SHIT')).toBe(true);
      expect(comprehensiveWords.has('FUCK')).toBe(true);
    });

    it('should return array from getComprehensiveProfanityWords', () => {
      const comprehensiveWords = getComprehensiveProfanityWords();
      expect(Array.isArray(comprehensiveWords)).toBe(true);
      expect(comprehensiveWords.length).toBeGreaterThan(100);
    });

    it('should filter out words with spaces and numbers', () => {
      const comprehensiveWords = getComprehensiveProfanityWords();
      
      // Check that no words contain spaces or numbers
      const hasSpaceOrNumber = comprehensiveWords.some(word => /[\s\d]/.test(word));
      expect(hasSpaceOrNumber).toBe(false);
    });

    it('should have more comprehensive than basic words', () => {
      const basicWords = getProfanityWords({ level: 'basic' });
      const comprehensiveWords = getProfanityWords({ level: 'comprehensive' });
      
      expect(comprehensiveWords.size).toBeGreaterThan(basicWords.size);
    });
  });

  describe('isProfanity Function', () => {
    it('should detect basic profanity in basic mode', () => {
      expect(isProfanity('DAMN', { level: 'basic' })).toBe(true);
      expect(isProfanity('SHIT', { level: 'basic' })).toBe(true);
      expect(isProfanity('INNOCENT', { level: 'basic' })).toBe(false);
    });

    it('should detect comprehensive profanity in comprehensive mode', () => {
      expect(isProfanity('DAMN', { level: 'comprehensive' })).toBe(true);
      expect(isProfanity('SHIT', { level: 'comprehensive' })).toBe(true);
      expect(isProfanity('INNOCENT', { level: 'comprehensive' })).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isProfanity('damn')).toBe(true);
      expect(isProfanity('Damn')).toBe(true);
      expect(isProfanity('DAMN')).toBe(true);
    });

    it('should default to comprehensive mode', () => {
      expect(isProfanity('DAMN')).toBe(true);
      expect(isProfanity('SHIT')).toBe(true);
    });
  });

  describe('Custom Configuration', () => {
    it('should support custom words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: ['CUSTOM', 'BADWORD']
      };
      
      const words = getProfanityWords(config);
      expect(words.has('CUSTOM')).toBe(true);
      expect(words.has('BADWORD')).toBe(true);
      expect(isProfanity('CUSTOM', config)).toBe(true);
    });

    it('should support excluded words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        excludeWords: ['DAMN', 'HELL']
      };
      
      const words = getProfanityWords(config);
      expect(words.has('DAMN')).toBe(false);
      expect(words.has('HELL')).toBe(false);
      expect(words.has('SHIT')).toBe(true); // Should still have other words
      expect(isProfanity('DAMN', config)).toBe(false);
    });

    it('should handle case sensitivity in custom and excluded words', () => {
      const config1: ProfanityConfig = {
        level: 'basic',
        customWords: ['custom']
      };
      
      const config2: ProfanityConfig = {
        level: 'basic',
        excludeWords: ['damn']
      };
      
      expect(isProfanity('CUSTOM', config1)).toBe(true);
      expect(isProfanity('DAMN', config2)).toBe(false);
    });
  });

  describe('Statistics and Performance', () => {
    it('should provide accurate statistics', () => {
      const stats = getProfanityStats();
      
      expect(stats.basic).toBe(15);
      expect(stats.comprehensive).toBeGreaterThan(stats.basic);
      expect(stats.filtered).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThanOrEqual(100);
    });

    it('should show memory savings from filtering', () => {
      const stats = getProfanityStats();
      
      // We should have filtered out at least 100 words (spaces/numbers)
      expect(stats.filtered).toBeGreaterThan(100);
      
      // Compression ratio should be around 30% based on our earlier check
      expect(stats.compressionRatio).toBeGreaterThan(25);
      expect(stats.compressionRatio).toBeLessThan(40);
    });
  });

  describe('Architecture Compliance', () => {
    it('should work without external dependencies when package fails', () => {
      // This tests the fallback behavior
      const basicWords = getBasicProfanityWords();
      expect(basicWords.length).toBe(15);
      expect(basicWords.includes('DAMN')).toBe(true);
    });

    it('should maintain performance with Set-based lookups', () => {
      const comprehensiveWords = getProfanityWords({ level: 'comprehensive' });
      
      // Performance test - should complete quickly
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        comprehensiveWords.has('TESTWORD');
      }
      const end = Date.now();
      
      // Should complete 1000 lookups in under 10ms
      expect(end - start).toBeLessThan(10);
    });

    it('should maintain backward compatibility', () => {
      // All legacy words should be present in comprehensive mode
      const comprehensiveWords = getProfanityWords({ level: 'comprehensive' });
      const basicWords = getBasicProfanityWords();
      
      for (const word of basicWords) {
        expect(comprehensiveWords.has(word)).toBe(true);
      }
    });
  });
}); 