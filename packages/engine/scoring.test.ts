/**
 * Unit tests for Scoring Module
 * 
 * Covers all scoring scenarios including letter additions, removals, moves,
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
  isValidMove,
  type ScoringResult
} from './scoring';

describe('Scoring Module', () => {

  describe('Core Scoring Rules - Base Letters Only', () => {
    it('should score CAT→CATS as 1 point (add letter)', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(0);
      expect(result.breakdown.movePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): S');
    });

    it('should score CAT→COAT as 1 point (add letter)', () => {
      const result = calculateScore('CAT', 'COAT');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(0);
      expect(result.breakdown.movePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): O');
    });

    it('should score CATS→BATS as 2 points (remove C, add B)', () => {
      const result = calculateScore('CATS', 'BATS');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(0);
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
    });

    it('should score CATS→TABS as 3 points (remove C, add T, move)', () => {
      const result = calculateScore('CATS', 'TABS');  
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(1);
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
      expect(result.actions).toContain('Moved letters');
    });

    it('should score CAT→BAT as 2 points (remove C, add B)', () => {
      const result = calculateScore('CAT', 'BAT');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(0);
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

  describe('Letter Move Scoring', () => {
    it('should give +1 point for moving same letters', () => {
      const result = calculateScore('CAT', 'TAC');
      expect(result.breakdown.movePoints).toBe(1);
      expect(result.actions).toContain('Moved letters');
    });

    it('should give +1 point for complex moves', () => {
      const result = calculateScore('LISTEN', 'SILENT');
      expect(result.breakdown.movePoints).toBe(1);
      expect(result.actions).toContain('Moved letters');
    });

    it('should give 0 points when letters are not moved', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(result.breakdown.movePoints).toBe(0);
    });
  });

  describe('Combined Operations', () => {
    it('should score add + remove operations independently', () => {
      const result = calculateScore('CAT', 'BAT'); // Remove C, add B
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(0);
    });

    it('should score add + remove + move operations independently', () => {
      const result = calculateScore('CATS', 'TABS'); // Remove C, add T, move ATS
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);  
      expect(result.breakdown.movePoints).toBe(1);
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
      expect(analysis.isMoved).toBe(false);
    });

    it('should correctly identify removed letters', () => {
      const analysis = analyzeWordChange('CATS', 'CAT');
      expect(analysis.addedLetters).toEqual([]);
      expect(analysis.removedLetters).toEqual(['S']);
      expect(analysis.isMoved).toBe(false);
    });

    it('should correctly identify move', () => {
      const analysis = analyzeWordChange('CAT', 'TAC');
      expect(analysis.addedLetters).toEqual([]);
      expect(analysis.removedLetters).toEqual([]);
      expect(analysis.isMoved).toBe(true);
    });

    it('should correctly identify substitution', () => {
      const analysis = analyzeWordChange('CAT', 'BAT');
      expect(analysis.addedLetters).toEqual(['B']);
      expect(analysis.removedLetters).toEqual(['C']);
      expect(analysis.isMoved).toBe(false);
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
      expect(result.breakdown.addLetterPoints).toBe(0);
      expect(result.breakdown.removeLetterPoints).toBe(0);
      expect(result.breakdown.movePoints).toBe(0);
    });

    it('should handle whitespace in inputs', () => {
      const result = calculateScore(' CAT ', 'CATS ');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
    });

    it('should handle case insensitivity', () => {
      const result = calculateScore('cat', 'CATS');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
    });

    it('should validate scoring results correctly', () => {
      const result = calculateScore('CAT', 'CATS');
      expect(validateScoringResult(result)).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    it('should provide quick scoring with getScoreForMove', () => {
      const score = getScoreForMove('CAT', 'CATS');
      expect(score).toBe(1);
    });

    it('should provide quick scoring for substitution', () => {
      const score = getScoreForMove('CAT', 'BAT');
      expect(score).toBe(2); // Remove C + Add B
    });

    it('should format score breakdown correctly', () => {
      const result = calculateScore('CAT', 'CATS');
      const formatted = formatScoreBreakdown(result);
      expect(formatted).toContain('Add: +1');
    });

    it('should handle no score formatting', () => {
      const result = calculateScore('CAT', 'CAT');
      const formatted = formatScoreBreakdown(result);
      expect(formatted).toBe('No score');
    });
  });

  describe('Performance Optimization', () => {
    it('should complete scoring within performance targets', () => {
      const result = performanceTestScoring(100);
      expect(result.averageTime).toBeLessThan(1); // Less than 1ms per operation
    });

    it('should handle batch scoring efficiently', () => {
      const testCases = [
        ['CAT', 'CATS'],
        ['DOG', 'DOGS'],
        ['HELLO', 'WORLD']
      ];
      
      const startTime = performance.now();
      testCases.forEach(([prev, curr]) => {
        calculateScore(prev, curr);
      });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Less than 10ms total
    });
  });

  describe('Integration with Game Rules', () => {
    it('should work with typical game flow', () => {
      // Simulate a typical game sequence
      let currentWord = 'CAT';
      let totalScore = 0;
      
      // Turn 1: CAT → CATS
      let result = calculateScore(currentWord, 'CATS');
      totalScore += result.totalScore;
      currentWord = 'CATS';
      
      // Turn 2: CATS → BATS
      result = calculateScore(currentWord, 'BATS');
      totalScore += result.totalScore;
      
      expect(totalScore).toBe(3); // 1 + 2
    });

    it('should handle complex word transformations', () => {
      const result = calculateScore('LISTEN', 'SILENT');
      expect(result.totalScore).toBe(1); // Just move
      expect(result.breakdown.movePoints).toBe(1);
    });
  });

  describe('Score Validation and Consistency', () => {
    it('should maintain consistent scoring across multiple calls', () => {
      const result1 = calculateScore('CAT', 'CATS');
      const result2 = calculateScore('CAT', 'CATS');
      
      expect(result1.totalScore).toBe(result2.totalScore);
      expect(result1.breakdown).toEqual(result2.breakdown);
    });

    it('should ensure breakdown math is always correct', () => {
      const testCases = [
        ['CAT', 'CATS'],
        ['CAT', 'BAT'],
        ['LISTEN', 'SILENT'],
        ['HELLO', 'WORLD']
      ];
      
      testCases.forEach(([prev, curr]) => {
        const result = calculateScore(prev, curr);
        const expectedTotal = Object.values(result.breakdown).reduce((sum, points) => sum + points, 0);
        expect(result.totalScore).toBe(expectedTotal);
      });
    });
  });

  describe('Key Letter Usage Scoring', () => {
    it('should give +1 point when using any key letter', () => {
      const result = calculateScore('CAT', 'CATS', { keyLetters: ['S'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.keyLettersUsed).toEqual(['S']);
      expect(result.actions).toContain('Used key letter(s): S');
    });

    it('should give 0 points when no key letters are used', () => {
      const result = calculateScore('CAT', 'COAT', { keyLetters: ['S'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(0);
      expect(result.keyLettersUsed).toEqual([]);
    });

    it('should handle case insensitivity for key letters', () => {
      const result = calculateScore('CAT', 'CATS', { keyLetters: ['s'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.keyLettersUsed).toEqual(['S']);
    });

    it('should give +1 point even when using multiple key letters', () => {
      const result = calculateScore('CAT', 'CAST', { keyLetters: ['S', 'T'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1); // Still just +1, not cumulative
      expect(result.keyLettersUsed).toEqual(['S', 'T']);
    });
  });

  describe('Key Letter Bonus Scoring', () => {
    it('should give +1 for key letter usage (no separate bonus)', () => {
      const result = calculateScore('CAT', 'CATS', { keyLetters: ['S'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.totalScore).toBe(2); // 1 for add + 1 for key usage
    });

    it('should give same +1 regardless of previous key letters', () => {
      const result1 = calculateScore('CAT', 'CATS', { keyLetters: ['S'] });
      const result2 = calculateScore('DOG', 'DOGS', { keyLetters: ['S'] });
      
      expect(result1.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result2.breakdown.keyLetterUsagePoints).toBe(1);
    });

    it('should give +1 even when using multiple key letters', () => {
      const result = calculateScore('CAT', 'CAST', { keyLetters: ['S', 'T'] });
      expect(result.breakdown.keyLetterUsagePoints).toBe(1);
      expect(result.keyLettersUsed).toEqual(['S', 'T']);
    });
  });

  describe('Complex Key Letter Combinations', () => {
    it('should score CAT→BAT+key B as 3 points (substitute + key usage)', () => {
      const result = calculateScore('CAT', 'BAT', { keyLetters: ['B'] });
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1); // Add B
      expect(result.breakdown.removeLetterPoints).toBe(1); // Remove C
      expect(result.breakdown.movePoints).toBe(0);
      expect(result.breakdown.keyLetterUsagePoints).toBe(1); // Used key letter B
      expect(result.actions).toContain('Added letter(s): B');
      expect(result.actions).toContain('Removed letter(s): C');
      expect(result.actions).toContain('Used key letter(s): B');
    });

    it('should handle key letters in game flow context', () => {
      // Simulate game with key letters
      const result1 = calculateScore('CAT', 'CATS', { keyLetters: ['S'] });
      expect(result1.totalScore).toBe(2); // Add + Key usage
      
      const result2 = calculateScore('CATS', 'BATS', { keyLetters: ['B'] });
      expect(result2.totalScore).toBe(3); // Remove + Add + Key usage
    });
  });

  describe('Move Validation Rules', () => {
    it('should allow valid single letter additions', () => {
      expect(isValidMove('CAT', 'CATS')).toBe(true);
      expect(isValidMove('CAT', 'COAT')).toBe(true);
    });

    it('should allow valid single letter removals', () => {
      expect(isValidMove('CATS', 'CAT')).toBe(true);
      expect(isValidMove('COAT', 'COT')).toBe(true);
    });

    it('should allow valid moves', () => {
      expect(isValidMove('CAT', 'TAC')).toBe(true);
      expect(isValidMove('CATS', 'TACS')).toBe(true);
    });

    it('should allow valid substitutions (one add + one remove)', () => {
      expect(isValidMove('CAT', 'BAT')).toBe(true);
      expect(isValidMove('CATS', 'BATS')).toBe(true);
    });

    it('should reject multiple letter additions', () => {
      expect(isValidMove('CAT', 'CASTLE')).toBe(false); // +TLE (3 additions)
      expect(isValidMove('DOG', 'DOGGY')).toBe(false); // +GY (2 additions)
    });

    it('should reject multiple letter removals', () => {
      expect(isValidMove('CASTLE', 'CAT')).toBe(false); // Remove SLE (3 removals)
      expect(isValidMove('DOGGY', 'DOG')).toBe(false); // Remove GY (2 removals)
    });

    it('should reject the specific DOSS→BOSSY case', () => {
      // This was incorrectly allowed before the fix
      // DOSS→BOSSY requires: Remove D, Add B, Add Y (2 additions = invalid)
      expect(isValidMove('DOSS', 'BOSSY')).toBe(false);
    });

    it('should allow complex but valid moves', () => {
      // One substitution + move is allowed
      expect(isValidMove('CATS', 'TABS')).toBe(true); // Remove C, Add T, move
      expect(isValidMove('DOG', 'GOD')).toBe(true); // Just move
    });
  });

  describe('Natural Shift vs Move Detection', () => {
    it('should NOT detect move for POPE → OPE (natural shift bug)', () => {
      // POPE → OPE should be 1 point (remove P), not 2 points (remove P + move)
      // This is removing the first P, and O,P,E naturally shift left - NOT a move
      const result = calculateScore('POPE', 'OPE');
      expect(result.totalScore).toBe(1);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(0); // This should be 0, not 1
      expect(result.actions).toContain('Removed letter(s): P');
      expect(result.actions).not.toContain('Moved letters');
    });

    it('should NOT detect move for FLOE → FOES (natural shift)', () => {
      // FLOE → FOES should be 2 points (remove L, add S), not 3 points (+ move)
      // When L is removed from position 1, O,E naturally shift left - NOT a move
      const result = calculateScore('FLOE', 'FOES');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(0); // This should be 0, not 1
      expect(result.actions).toContain('Removed letter(s): L');
      expect(result.actions).toContain('Added letter(s): S');
      expect(result.actions).not.toContain('Moved letters');
    });

    it('should still detect TRUE move for NARD → YARN', () => {
      // NARD → YARN should be 3 points (remove D, add Y, move N,A,R)
      const result = calculateScore('NARD', 'YARN');
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.removeLetterPoints).toBe(1);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(1);
    });

    it('should correctly score NAG → LANG as 2 points (add L, move) under new rules', () => {
      // With the new rules, this is add L (+1) and move NA->AN (+1)
      const result = calculateScore('NAG', 'LANG');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1);
      expect(result.breakdown.movePoints).toBe(1);
      expect(result.actions).toContain('Added letter(s): L');
      expect(result.actions).toContain('Moved letters');
    });

    it('should correctly score EARL → GEAR as 3 points (remove L, add G, key usage)', () => {
      // EARL → GEAR: Remove L, Add G, Use key letter G
      const result = calculateScore('EARL', 'GEAR', { keyLetters: ['G'] });
      expect(result.totalScore).toBe(3);
      expect(result.breakdown.addLetterPoints).toBe(1); // Add G
      expect(result.breakdown.removeLetterPoints).toBe(1); // Remove L
      expect(result.breakdown.movePoints).toBe(0); // No move needed
      expect(result.breakdown.keyLetterUsagePoints).toBe(1); // Used key letter G
      expect(result.actions).toContain('Added letter(s): G');
      expect(result.actions).toContain('Removed letter(s): L');
      expect(result.actions).toContain('Used key letter(s): G');
    });

    it('should correctly score REAR → EARL as 2 points (remove R, add L, no move)', () => {
      // REAR → EARL: Remove one R, Add L, but EAR sequence is preserved (natural shift)
      const result = calculateScore('REAR', 'EARL');
      expect(result.totalScore).toBe(2);
      expect(result.breakdown.addLetterPoints).toBe(1); // Add L
      expect(result.breakdown.removeLetterPoints).toBe(1); // Remove R
      expect(result.breakdown.movePoints).toBe(0); // No move - EAR sequence preserved
      expect(result.breakdown.keyLetterUsagePoints).toBe(0); // No key letters
      expect(result.actions).toContain('Added letter(s): L');
      expect(result.actions).toContain('Removed letter(s): R');
      expect(result.actions).not.toContain('Moved letters');
    });
  });
}); 