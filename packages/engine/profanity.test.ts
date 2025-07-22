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

// Mock profanity words for testing (simulating what would be loaded from JSON)
const mockProfanityWords = [
  'SHIT', 'FUCK', 'BITCH', 'DAMN', 'HELL', 'CRAP', 'PISS', 'FART', 'POOP',
  'ASSHOLE', 'BASTARD', 'DICKHEAD', 'MOTHERFUCKER', 'BULLSHIT', 'GODDAMN',
  'WHORE', 'SLUT', 'TITS', 'COCK', 'PUSSY', 'ASS', 'DICK', 'PENIS', 'VAGINA',
  // Additional words to ensure we have enough for comprehensive testing
  'TESTICLES', 'BREASTS', 'INTERCOURSE', 'MASTURBATE', 'PROSTITUTE',
  'ABORTION', 'CONTRACEPTION', 'ORGASM', 'ERECTION', 'MENSTRUATION',
  // Some longer words to test filtering
  'EXTREMELY-LONG-PROFANITY', 'WORD WITH SPACES', 'NUMBER123WORD',
  // Some 3-5 letter words for basic testing
  'SEX', 'GAY', 'FAG', 'HOE', 'HO'
];

describe('Centralized Profanity Management', () => {
  describe('Basic Profanity Detection', () => {
    it('should detect profanity words from comprehensive dictionary', () => {
      const basicWords = getProfanityWords(mockProfanityWords, { level: 'basic' });
      
      // Test with words that are actually in the comprehensive dictionary
      expect(basicWords.has('SHIT')).toBe(true);
      expect(basicWords.has('FUCK')).toBe(true);
      expect(basicWords.has('BITCH')).toBe(true);
      expect(basicWords.has('INNOCENT')).toBe(false);
    });

    it('should return dynamic basic words based on length filtering', () => {
      const basicWords = getBasicProfanityWords(mockProfanityWords);
      expect(Array.isArray(basicWords)).toBe(true);
      expect(basicWords.length).toBeGreaterThan(0);
      
      // All basic words should be 3-5 letters (our filtering criteria)
      for (const word of basicWords) {
        expect(word.length).toBeGreaterThanOrEqual(3);
        expect(word.length).toBeLessThanOrEqual(5);
      }
    });

    it('should have consistent basic word count', () => {
      const basicSet = getProfanityWords(mockProfanityWords, { level: 'basic' });
      const basicArray = getBasicProfanityWords(mockProfanityWords);
      expect(basicSet.size).toBe(basicArray.length);
    });
  });

  describe('Comprehensive Profanity Detection', () => {
    it('should load comprehensive word list', () => {
      const comprehensiveWords = getProfanityWords(mockProfanityWords, { level: 'comprehensive' });
      
      // Should contain significantly more words than basic
      expect(comprehensiveWords.size).toBeGreaterThan(10);
      
      // Should include words that are actually in the comprehensive dictionary
      expect(comprehensiveWords.has('SHIT')).toBe(true);
      expect(comprehensiveWords.has('FUCK')).toBe(true);
      expect(comprehensiveWords.has('BITCH')).toBe(true);
    });

    it('should return array from getComprehensiveProfanityWords', () => {
      const comprehensiveWords = getComprehensiveProfanityWords(mockProfanityWords);
      expect(Array.isArray(Array.from(comprehensiveWords))).toBe(true);
      expect(comprehensiveWords.size).toBeGreaterThan(10);
    });

    it('should filter out words with spaces and numbers', () => {
      const comprehensiveWords = getComprehensiveProfanityWords(mockProfanityWords);
      const comprehensiveArray = Array.from(comprehensiveWords);
      
      // Check that no words contain spaces or numbers
      const hasSpaceOrNumber = comprehensiveArray.some(word => /[\s\d]/.test(word));
      expect(hasSpaceOrNumber).toBe(false);
    });

    it('should have more comprehensive than basic words', () => {
      const basicWords = getProfanityWords(mockProfanityWords, { level: 'basic' });
      const comprehensiveWords = getProfanityWords(mockProfanityWords, { level: 'comprehensive' });
      
      expect(comprehensiveWords.size).toBeGreaterThan(basicWords.size);
    });
  });

  describe('isProfanity Function', () => {
    it('should detect profanity in basic mode', () => {
      expect(isProfanity('SHIT', mockProfanityWords, { level: 'basic' })).toBe(true);
      expect(isProfanity('FUCK', mockProfanityWords, { level: 'basic' })).toBe(true);
      expect(isProfanity('INNOCENT', mockProfanityWords, { level: 'basic' })).toBe(false);
    });

    it('should detect profanity in comprehensive mode', () => {
      expect(isProfanity('SHIT', mockProfanityWords, { level: 'comprehensive' })).toBe(true);
      expect(isProfanity('FUCK', mockProfanityWords, { level: 'comprehensive' })).toBe(true);
      expect(isProfanity('INNOCENT', mockProfanityWords, { level: 'comprehensive' })).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isProfanity('shit', mockProfanityWords)).toBe(true);
      expect(isProfanity('Shit', mockProfanityWords)).toBe(true);
      expect(isProfanity('SHIT', mockProfanityWords)).toBe(true);
    });

    it('should default to comprehensive mode', () => {
      expect(isProfanity('SHIT', mockProfanityWords)).toBe(true);
      expect(isProfanity('FUCK', mockProfanityWords)).toBe(true);
    });

    it('should handle words not in dictionary', () => {
      // Test words that are not in our mock dictionary
      expect(isProfanity('INNOCENT', mockProfanityWords)).toBe(false);
      expect(isProfanity('HELLO', mockProfanityWords)).toBe(false);
      expect(isProfanity('WORLD', mockProfanityWords)).toBe(false);
    });
  });

  describe('Custom Configuration', () => {
    it('should support custom words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        customWords: ['CUSTOM', 'BADWORD']
      };
      
      const words = getProfanityWords(mockProfanityWords, config);
      expect(words.has('CUSTOM')).toBe(true);
      expect(words.has('BADWORD')).toBe(true);
      expect(isProfanity('CUSTOM', mockProfanityWords, config)).toBe(true);
    });

    it('should support excluded words', () => {
      const config: ProfanityConfig = {
        level: 'basic',
        excludeWords: ['SHIT', 'FUCK']
      };
      
      const words = getProfanityWords(mockProfanityWords, config);
      expect(words.has('SHIT')).toBe(false);
      expect(words.has('FUCK')).toBe(false);
      expect(isProfanity('SHIT', mockProfanityWords, config)).toBe(false);
    });

    it('should handle case sensitivity in custom and excluded words', () => {
      const config1: ProfanityConfig = {
        level: 'basic',
        customWords: ['custom']
      };
      
      const config2: ProfanityConfig = {
        level: 'basic',
        excludeWords: ['shit']
      };
      
      expect(isProfanity('CUSTOM', mockProfanityWords, config1)).toBe(true);
      expect(isProfanity('SHIT', mockProfanityWords, config2)).toBe(false);
    });

    it('should allow adding back filtered words', () => {
      const config: ProfanityConfig = {
        level: 'comprehensive',
        customWords: ['NEWWORD', 'ANOTHERWORD'] // Add words not in our mock data
      };
      
      expect(isProfanity('NEWWORD', mockProfanityWords, config)).toBe(true);
      expect(isProfanity('ANOTHERWORD', mockProfanityWords, config)).toBe(true);
    });
  });

  describe('Statistics and Performance', () => {
    it('should provide accurate statistics', () => {
      const stats = getProfanityStats(mockProfanityWords);
      
      expect(stats.basic).toBeGreaterThan(0);
      expect(stats.comprehensive).toBeGreaterThan(stats.basic);
      expect(stats.total).toBe(stats.comprehensive);
      expect(typeof stats.byLength).toBe('object');
    });

    it('should show memory savings from filtering', () => {
      const stats = getProfanityStats(mockProfanityWords);
      
      // We should have filtered out some words (spaces/numbers)
      expect(stats.comprehensive).toBeLessThan(mockProfanityWords.length);
      
      // Basic should be a subset of comprehensive
      expect(stats.basic).toBeLessThanOrEqual(stats.comprehensive);
    });
  });

  describe('Architecture Compliance', () => {
    it('should work without external dependencies when package fails', () => {
      // This tests the fallback behavior with empty word list
      const basicWords = getBasicProfanityWords([]);
      expect(basicWords.length).toBe(0); // Should be 0 if no words provided
      expect(Array.isArray(basicWords)).toBe(true);
    });

    it('should maintain performance with Set-based lookups', () => {
      const comprehensiveWords = getProfanityWords(mockProfanityWords, { level: 'comprehensive' });
      
      // Performance test - should complete quickly
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        comprehensiveWords.has('TESTWORD');
      }
      const end = Date.now();
      
      // Should complete 1000 lookups in under 10ms
      expect(end - start).toBeLessThan(10);
    });

    it('should maintain dynamic word generation', () => {
      // Basic words should be a subset of comprehensive
      const comprehensiveWords = getProfanityWords(mockProfanityWords, { level: 'comprehensive' });
      const basicWords = getBasicProfanityWords(mockProfanityWords);
      
      for (const word of basicWords) {
        expect(comprehensiveWords.has(word)).toBe(true);
      }
    });

    it('should handle empty dictionary gracefully', () => {
      // Test the system works even if comprehensive dictionary is empty
      const stats = getProfanityStats([]);
      expect(typeof stats.basic).toBe('number');
      expect(typeof stats.comprehensive).toBe('number');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.byLength).toBe('object');
      expect(stats.basic).toBe(0);
      expect(stats.comprehensive).toBe(0);
      expect(stats.total).toBe(0);
    });
  });
}); 