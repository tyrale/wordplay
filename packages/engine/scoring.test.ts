/**
 * Unit tests for Scoring Module
 * 
 * Covers all scoring scenarios including letter additions, removals, rearrangements,
 * key letter bonuses, and complex action combinations as specified in task 1.2.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  getScoreForMove,
  analyzeWordChange,
  validateScoringResult,
  performanceTestScoring,
  formatScoreBreakdown,
  type ScoringResult
} from './scoring';

describe('Scoring Module', () => {

  describe('Core Scoring Rules - Base Letters Only', () => {
    it('should score CAT→CATS as 1 point (add letter)', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(0);
      expect(result.breakdown.rearrangePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): S');
    });

    it('should score CAT→COAT as 1 point (add letter)', () => {
      const result = calculateScore('CAT', 'COAT');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(0);
      expect(result.breakdown.rearrangePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): O');
    });

    it('should score CATS→BATS as 2 points (remove C, add B)', () => {
      const result = calculateScore('CATS', 'BATS');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.rearrangePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
    });

    it('should score CATS→TABS as 3 points (remove C, add T, rearrange)', () => {
      const result = calculateScore('CATS', 'TABS');  
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.rearrangePoints).toBe(1);
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
      expect(result.actions).toContain('Rearranged letters');
    });

    it('should score CAT→BAT as 2 points (remove C, add B)', () => {
      const result = calculateScore('CAT', 'BAT');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.rearrangePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
    });
  });

  describe('Letter Addition Scoring', () => {
    it('should give +1 point for adding one letter', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.actions).toContain('Added letter(s): S');
    });

    it('should give +1 point for adding multiple letters (not cumulative)', () => {
      const result = calculateScore('CAT', 'SCATS');
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.actions).toContain('Added letter(s): S, S');
    });

    it('should give 0 points when no letters are added', () => {
      const result = calculateScore('CATS', 'CAT');
      expect(result.breakdown.addLetterPoints).toBe(0);
    });
  });

  describe('Letter Removal Scoring', () => {
    it('should give +1 point for removing one letter', () => {
      const result = calculateScore('CATS', 'CAT');
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.actions).toContain('Removed letter(s): S');
    });

    it('should give +1 point for removing multiple letters (not cumulative)', () => {
      const result = calculateScore('SCATS', 'CAT');
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.actions).toContain('Removed letter(s): S, S');
    });

    it('should give 0 points when no letters are removed', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(result.breakdown.removeLetterPoints).toBe(0);
    });
  });

  describe('Letter Rearrangement Scoring', () => {
    it('should give +1 point for rearranging same letters', () => {
      const result = calculateScore('CAT', 'TAC');
      expect(result.breakdown.rearrangePoints).toBe(1);
      expect(result.actions).toContain('Rearranged letters');
    });

    it('should give +1 point for complex rearrangements', () => {
      const result = calculateScore('LISTEN', 'SILENT');
      expect(result.breakdown.rearrangePoints).toBe(1);
      expect(result.actions).toContain('Rearranged letters');
    });

    it('should give 0 points when letters are not rearranged', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(result.breakdown.rearrangePoints).toBe(0);
    });
  });

  describe('Combined Operations', () => {
    it('should score add + remove operations independently', () => {
      const result = calculateScore('CAT', 'BAT'); // Remove C, add B
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.rearrangePoints).toBe(0);
    });

    it('should score add + remove + rearrange operations independently', () => {
      const result = calculateScore('CATS', 'TABS'); // Remove C, add T, rearrange ATS
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);  
      expect(result.breakdown.rearrangePoints).toBe(1);
    });

    it('should handle multiple add/remove operations', () => {
      const result = calculateScore('CAT', 'BRAY'); // Remove C,A,T, add B,R,A,Y
      expect(result.totalScore).toBe(2); // +1 add, +1 remove (not cumulative)
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
    });
  });

  describe('Word Analysis Function', () => {
    it('should correctly identify added letters', () => {
      const analysis = analyzeWordChange('CAT', 'CATS');
      expect(analysis.addedLetters).toEqual(['S']);
      expect(analysis.removedLetters).toEqual([]);
      expect(analysis.isRearranged).toBe(false);
    });

    it('should correctly identify removed letters', () => {
      const analysis = analyzeWordChange('CATS', 'CAT');
      expect(analysis.addedLetters).toEqual([]);
      expect(analysis.removedLetters).toEqual(['S']);
      expect(analysis.isRearranged).toBe(false);
    });

    it('should correctly identify rearrangement', () => {
      const analysis = analyzeWordChange('CAT', 'TAC');
      expect(analysis.addedLetters).toEqual([]);
      expect(analysis.removedLetters).toEqual([]);
      expect(analysis.isRearranged).toBe(true);
    });

    it('should correctly identify substitution', () => {
      const analysis = analyzeWordChange('CAT', 'BAT');
      expect(analysis.addedLetters).toEqual(['B']);
      expect(analysis.removedLetters).toEqual(['C']);
      expect(analysis.isRearranged).toBe(false);
    });

    it('should handle duplicate letters correctly', () => {
      const analysis = analyzeWordChange('CAT', 'CATTLE');
      expect(analysis.addedLetters).toEqual(['T', 'L', 'E']);
      expect(analysis.removedLetters).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty/null inputs gracefully', () => {
      const result1 = calculateScore('', 'HELLO');
      expect(result1.totalScore).toBe(0);

      const result2 = calculateScore('HELLO', '');
      expect(result2.totalScore).toBe(0);
    });

    it('should handle identical words', () => {
      const result = calculateScore('HELLO', 'HELLO');
      expect(result.totalScore).toBe(0);
      expect(result.actions).toEqual([]);
    });

    it('should handle whitespace in inputs', () => {
      const result = calculateScore('  CAT  ', '  CATS  ');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
    });

    it('should handle case insensitivity', () => {
      const result = calculateScore('cat', 'CATS');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
    });

    it('should validate scoring results correctly', () => {
      const validResult: ScoringResult = {
        totalScore: 2,
        breakdown: {
          addLetterPoints: 1,
          removeLetterPoints: 1,
          rearrangePoints: 0,
          keyLetterUsagePoints: 0,
        },
        actions: ['Added letter(s): B', 'Removed letter(s): C'],
        keyLettersUsed: []
      };
      
      expect(validateScoringResult(validResult)).toBe(true);

      const invalidResult = { ...validResult, totalScore: 5 };
      expect(validateScoringResult(invalidResult)).toBe(false);
    });
  });

  describe('Convenience Functions', () => {
    it('should provide quick scoring with getScoreForMove', () => {
      const score = getScoreForMove('CAT', 'CATS');
      expect(score).toBe(1);
    });

    it('should provide quick scoring for substitution', () => {
      const score = getScoreForMove('CAT', 'BAT');
      expect(score).toBe(2);
    });

    it('should format score breakdown correctly', () => {
      const result = calculateScore('CAT', 'BAT');
      const formatted = formatScoreBreakdown(result);
      expect(formatted).toContain('Add:');
      expect(formatted).toContain('Remove:');
    });

    it('should handle no score formatting', () => {
      const result = calculateScore('HELLO', 'HELLO');
      const formatted = formatScoreBreakdown(result);
      expect(formatted).toBe('No score');
    });
  });

  describe('Performance Optimization', () => {
    it('should complete scoring within performance targets', () => {
      const { averageTime } = performanceTestScoring(100);
      
      // Should average much less than 1ms per scoring operation
      expect(averageTime).toBeLessThan(1);
    });

    it('should handle batch scoring efficiently', () => {
      const moves = [
        { prev: 'CAT', curr: 'CATS' },
        { prev: 'CAT', curr: 'BAT' },
        { prev: 'LISTEN', curr: 'SILENT' }
      ];
      
      const startTime = performance.now();
      
      moves.forEach(move => {
        for (let i = 0; i < 100; i++) {
          calculateScore(move.prev, move.curr);
        }
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should process 300 scoring operations quickly
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe('Integration with Game Rules', () => {
    it('should work with typical game flow', () => {
      // Simulate a turn sequence
      let score = 0;
      
      // Turn 1: CAT → CATS
      let result = calculateScore('CAT', 'CATS');
      score += result.totalScore;
      expect(score).toBe(1);
      
      // Turn 2: CATS → BATS (substitution)
      result = calculateScore('CATS', 'BATS');
      score += result.totalScore;
      expect(score).toBe(3); // Previous 1 + new 2 (add + remove)
      
      // Turn 3: BATS → TABS (rearrangement only)
      result = calculateScore('BATS', 'TABS');
      score += result.totalScore;
      expect(score).toBe(4); // Previous 3 + new 1 (rearrange only)
    });

    it('should handle complex word transformations', () => {
      const result = calculateScore('LISTEN', 'SILENT');
      expect(result.totalScore).toBe(1); // Just rearrangement
      expect(result.breakdown.rearrangePoints).toBe(1);
    });
  });

  describe('Score Validation and Consistency', () => {
    it('should maintain consistent scoring across multiple calls', () => {
      const testCases = [
        { prev: 'CAT', curr: 'CATS', expected: 1 },
        { prev: 'CAT', curr: 'COAT', expected: 1 },
        { prev: 'LISTEN', curr: 'SILENT', expected: 1 },
        { prev: 'CAT', curr: 'BAT', expected: 2 },
        { prev: 'CATS', curr: 'BATS', expected: 2 },
        { prev: 'CATS', curr: 'TABS', expected: 3 }
      ];
      
      testCases.forEach(test => {
        // Run the same test multiple times
        for (let i = 0; i < 5; i++) {
          const result = calculateScore(test.prev, test.curr);
          expect(result.totalScore).toBe(test.expected);
        }
      });
    });

    it('should ensure breakdown math is always correct', () => {
      const testMoves = [
        { prev: 'CAT', curr: 'CATS' },
        { prev: 'CAT', curr: 'BAT' },
        { prev: 'CATS', curr: 'TABS' },
        { prev: 'LISTEN', curr: 'SILENT' }
      ];
      
      testMoves.forEach(move => {
        const result = calculateScore(move.prev, move.curr);
        
        // Verify breakdown math
        const calculatedTotal = Object.values(result.breakdown)
          .reduce((sum, points) => sum + points, 0);
        expect(result.totalScore).toBe(calculatedTotal);
        
        // Verify result passes validation
        expect(validateScoringResult(result)).toBe(true);
      });
    });
  });

  describe('Key Letter Usage Scoring', () => {
    it('should give +1 point when using any key letter', () => {
      const result = calculateScore('CAT', 'BAT', { keyLetters: ['B'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.actions).toContain('Used key letter(s): B');
      expect(result.totalScore).toBe(3); // add(1) + remove(1) + key usage(1)
    });

    it('should give 0 points when no key letters are used', () => {
      const result = calculateScore('CAT', 'COT', { keyLetters: ['B', 'R'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(0);
    });

    it('should handle case insensitivity for key letters', () => {
      const result = calculateScore('cat', 'bat', { keyLetters: ['b'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.keyLettersUsed).toContain('B');
    });

    it('should give +1 point even when using multiple key letters', () => {
      const result = calculateScore('CAT', 'BRAT', { keyLetters: ['B', 'R'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.actions).toContain('Used key letter(s): B, R');
    });
  });

  describe('Key Letter Bonus Scoring', () => {
    it('should give +1 for key letter usage (no separate bonus)', () => {
      const result = calculateScore('CAT', 'CATS', { 
        keyLetters: ['S']
      });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.actions).toContain('Used key letter(s): S');
      expect(result.totalScore).toBe(2); // add(1) + key usage(1)
    });

    it('should give same +1 regardless of previous key letters', () => {
      const result = calculateScore('CAT', 'CATS', { 
        keyLetters: ['S']
      });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.totalScore).toBe(2); // add(1) + key usage(1)
    });

    it('should give +1 even when using multiple key letters', () => {
      const result = calculateScore('CAT', 'BRATS', { 
        keyLetters: ['B', 'R', 'S']
      });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.actions).toContain('Used key letter(s): B, R, S');
      expect(result.totalScore).toBe(3); // add(1) + remove(1) + key usage(1)
    });
  });

  describe('Complex Key Letter Combinations', () => {
    it('should handle add + key usage combination', () => {
      const result = calculateScore('CAT', 'TACK', { keyLetters: ['K'] });
      
      expect(result.totalScore).toBe(2); // add(1) + key usage(1)
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
    });

    it('should score CAT→BAT+key B as 3 points (substitute + key usage)', () => {
      const result = calculateScore('CAT', 'BAT', { keyLetters: ['B'] });
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1); // Add B
      expect(result.breakdown.removeLetterPoints).toBe(1); // Remove C
      expect(result.breakdown.rearrangePoints).toBe(0);
      expect(result.breakdown.keyLetterUsagePoints).toBe(1); // Used key letter B
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
      expect(result.actions).toContain('Used key letter(s): B');
    });

    it('should handle key letters in game flow context', () => {
      // First move without key letters
      const result1 = calculateScore('CAT', 'CATS');
      expect(result1.totalScore).toBe(1);
      
      // Second move with key letter available
      const result2 = calculateScore('CATS', 'BATS', { 
        keyLetters: ['B']
      });
      expect(result2.totalScore).toBe(3); // add(1) + remove(1) + key usage(1)
    });
  });
}); 