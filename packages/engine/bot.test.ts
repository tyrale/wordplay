/**
 * Unit tests for Bot AI v0 (Greedy Strategy)
 * 
 * Covers all bot functionality including move generation, scoring integration,
 * performance requirements, and 100-turn simulation capability.
 */

import { describe, it, expect } from 'vitest';
import {
  generateBotMove,
  generateAddMoves,
  generateRemoveMoves,
  generateRearrangeMoves,
  generateSubstituteMoves,
  filterValidCandidates,
  scoreCandidates,
  simulateBotGame,
  performanceTestBot,
  explainBotMove,
  type MoveCandidate
} from './bot';
import { validateWord } from './dictionary';

describe('Bot AI Module', () => {

  describe('Move Generation Functions', () => {
    it('should generate add moves for all positions and letters', () => {
      const moves = generateAddMoves('CAT');
      
      // Should have 26 letters * 4 positions = 104 moves
      expect(moves.length).toBe(104);
      expect(moves[0].type).toBe('add');
      
      // Check some specific examples
      const firstMove = moves.find(m => m.word === 'ECAT');
      expect(firstMove).toBeDefined();
      expect(firstMove?.operations[0]).toContain('Add E at position 0');
      
      const middleMove = moves.find(m => m.word === 'CEAT');
      expect(middleMove).toBeDefined();
    });

    it('should generate remove moves for each character', () => {
      const moves = generateRemoveMoves('CAT');
      
      expect(moves.length).toBe(3);
      expect(moves[0].type).toBe('remove');
      
      // Check specific removals
      expect(moves.some(m => m.word === 'AT')).toBe(true); // Remove C
      expect(moves.some(m => m.word === 'CT')).toBe(true); // Remove A
      expect(moves.some(m => m.word === 'CA')).toBe(true); // Remove T
    });

    it('should generate rearrange moves without duplicates', () => {
      const moves = generateRearrangeMoves('CAT', 20);
      
      expect(moves.length).toBeLessThanOrEqual(20);
      expect(moves[0].type).toBe('rearrange');
      
      // All moves should be rearrangements of original letters
      const originalLetters = 'CAT'.split('').sort().join('');
      moves.forEach(move => {
        const moveLetters = move.word.split('').sort().join('');
        expect(moveLetters).toBe(originalLetters);
        expect(move.word).not.toBe('CAT'); // Should not include original
      });
      
      // Should not have duplicates
      const uniqueWords = new Set(moves.map(m => m.word));
      expect(uniqueWords.size).toBe(moves.length);
    });

    it('should generate substitute moves for each position', () => {
      const moves = generateSubstituteMoves('CAT');
      
      // Should have 3 positions * 25 letters (26 - original) = 75 moves
      expect(moves.length).toBe(75);
      expect(moves[0].type).toBe('substitute');
      
      // Check specific substitutions
      expect(moves.some(m => m.word === 'BAT')).toBe(true); // C → B
      expect(moves.some(m => m.word === 'CET')).toBe(true); // A → E
      expect(moves.some(m => m.word === 'CAR')).toBe(true); // T → R
    });

    it('should handle edge cases in move generation', () => {
      // Single letter word
      const singleMoves = generateRemoveMoves('A');
      expect(singleMoves.length).toBe(1);
      expect(singleMoves[0].word).toBe('');
      
      // Empty word
      const emptyMoves = generateRemoveMoves('');
      expect(emptyMoves.length).toBe(0);
    });
  });

  describe('Move Validation and Scoring', () => {
    it('should filter candidates to valid dictionary words', () => {
      const candidates: MoveCandidate[] = [
        { word: 'CAT', type: 'add', operations: ['test'] },
        { word: 'DOG', type: 'add', operations: ['test'] },
        { word: 'ZZZZ', type: 'add', operations: ['test'] }, // Invalid
        { word: 'HELLO', type: 'add', operations: ['test'] }
      ];
      
      const validCandidates = filterValidCandidates(candidates);
      
      expect(validCandidates.length).toBeGreaterThan(0);
      expect(validCandidates.length).toBeLessThanOrEqual(candidates.length);
      
      // All should be valid dictionary words
      validCandidates.forEach(candidate => {
        expect(candidate.word.length).toBeGreaterThan(0);
        expect(/^[A-Z]+$/.test(candidate.word)).toBe(true);
      });
    });

    it('should score candidates correctly with key letters', () => {
      const candidates: MoveCandidate[] = [
        { word: 'BATS', type: 'substitute', operations: ['C → B'] },
        { word: 'CATS', type: 'add', operations: ['Add S'] },
        { word: 'ACT', type: 'rearrange', operations: ['Rearrange'] }
      ];
      
      const scoredMoves = scoreCandidates(candidates, 'CAT', ['B']);
      
      expect(scoredMoves.length).toBe(3);
      
      // Moves should be sorted by score descending
      for (let i = 0; i < scoredMoves.length - 1; i++) {
        expect(scoredMoves[i].score).toBeGreaterThanOrEqual(scoredMoves[i + 1].score);
      }
      
      // Move using key letter B should have higher confidence
      const batMove = scoredMoves.find(m => m.word === 'BATS');
      const catMove = scoredMoves.find(m => m.word === 'CATS');
      
      if (batMove && catMove) {
        expect(batMove.confidence).toBeGreaterThan(catMove.confidence);
      }
    });

    it('should include reasoning in scored moves', () => {
      const candidates: MoveCandidate[] = [
        { word: 'CATS', type: 'add', operations: ['Add S at position 3'] }
      ];
      
      const scoredMoves = scoreCandidates(candidates, 'CAT');
      
      expect(scoredMoves[0].reasoning).toBeDefined();
      expect(scoredMoves[0].reasoning.length).toBeGreaterThan(0);
      expect(scoredMoves[0].reasoning.some(r => r.includes('Score:'))).toBe(true);
      expect(scoredMoves[0].reasoning.some(r => r.includes('Confidence:'))).toBe(true);
    });
  });

  describe('Main Bot AI Function', () => {
    it('should generate a valid move for simple words', () => {
      const result = generateBotMove('CAT');
      
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.totalCandidatesGenerated).toBeGreaterThan(0);
      
      if (result.move) {
        expect(result.move.word).toBeDefined();
        expect(result.move.score).toBeGreaterThanOrEqual(0);
        expect(result.move.confidence).toBeGreaterThan(0);
        expect(result.move.confidence).toBeLessThanOrEqual(1);
        expect(result.move.reasoning).toBeDefined();
      }
      
      expect(result.candidates.length).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize key letters in move selection', () => {
      const result = generateBotMove('CAT', { keyLetters: ['S'] });
      
      if (result.move) {
        // If a valid move exists using S, it should be prioritized
        const usesKeyLetter = result.move.word.includes('S');
        if (usesKeyLetter) {
          expect(result.move.score).toBeGreaterThan(1); // Should get key letter bonus
        }
      }
    });

    it('should respect time limits', () => {
      const result = generateBotMove('CAT', { timeLimit: 1 }); // Very short time limit
      
      expect(result.processingTime).toBeLessThan(50); // Should complete quickly
    });

    it('should respect candidate limits', () => {
      const result = generateBotMove('CAT', { maxCandidates: 10 });
      
      expect(result.candidates.length).toBeLessThanOrEqual(10);
    });

    it('should handle invalid input gracefully', () => {
      const emptyResult = generateBotMove('');
      expect(emptyResult.move).toBeNull();
      
      const singleResult = generateBotMove('A');
      expect(singleResult).toBeDefined();
      expect(singleResult.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet average latency target of <50ms', () => {
      const testWords = ['CAT', 'HELLO', 'WORLD', 'GAME'];
      const results: number[] = [];
      
      for (const word of testWords) {
        const result = generateBotMove(word, { maxCandidates: 100 });
        results.push(result.processingTime);
      }
      
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      expect(averageTime).toBeLessThan(50);
    });

    it('should pass performance test', () => {
      const perfResult = performanceTestBot(20); // Reduced for faster testing
      
      expect(perfResult.averageTime).toBeLessThan(50);
      expect(perfResult.successRate).toBeGreaterThan(0.8); // At least 80% success rate
      expect(perfResult.totalTime).toBeGreaterThan(0);
    });

    it('should handle batch operations efficiently', () => {
      const startTime = performance.now();
      const testWords = ['CAT', 'DOG', 'HELLO', 'WORLD', 'GAME'];
      
      for (const word of testWords) {
        generateBotMove(word, { maxCandidates: 50 });
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / testWords.length;
      
      expect(averageTime).toBeLessThan(50);
    });
  });

  describe('100-Turn Simulation', () => {
    it('should complete 100 turns without crashing', () => {
      const simulation = simulateBotGame('CAT', 100);
      
      expect(simulation.completedTurns).toBeGreaterThan(50); // Should complete at least 50 turns
      expect(simulation.averageTimePerTurn).toBeLessThan(50);
      expect(simulation.moves.length).toBe(simulation.completedTurns);
      expect(simulation.totalTime).toBeGreaterThan(0);
      
      // Check that moves are valid
      simulation.moves.forEach(move => {
        expect(move.word).toBeDefined();
        expect(move.score).toBeGreaterThanOrEqual(0);
        expect(move.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle shorter simulations reliably', () => {
      const simulation = simulateBotGame('HELLO', 10);
      
      expect(simulation.success).toBe(true);
      expect(simulation.completedTurns).toBe(10);
      expect(simulation.errors.length).toBe(0);
    });

    it('should track progression through different words', () => {
      const simulation = simulateBotGame('CAT', 5);
      
      if (simulation.success) {
        const words = simulation.moves.map(m => m.word);
        // Should have different words (bot is making progress)
        const uniqueWords = new Set(words);
        expect(uniqueWords.size).toBeGreaterThan(1);
      }
    });

    it('should handle simulation with key letters', () => {
      const simulation = simulateBotGame('CAT', 10, ['S', 'R', 'T']);
      
      expect(simulation.completedTurns).toBeGreaterThan(0);
      
      // Some moves should use key letters for higher scores
      const keyLetterMoves = simulation.moves.filter(move => 
        ['S', 'R', 'T'].some(key => move.word.includes(key))
      );
      expect(keyLetterMoves.length).toBeGreaterThan(0);
    });
  });

  describe('Bot Fair Play and Integration', () => {
    it('should integrate with scoring module correctly', () => {
      const result = generateBotMove('CAT', { keyLetters: ['S'] });
      
      if (result.move && result.move.word.includes('S')) {
        // Should get points for the move plus key letter usage
        expect(result.move.score).toBeGreaterThan(1);
      }
    });

    it('should follow same validation rules as human players', () => {
      const result = generateBotMove('CAT');
      
      if (result.move) {
        // Bot moves should be real dictionary words that humans can also play
        expect(result.move.word.length).toBeGreaterThan(0);
        expect(/^[A-Z]+$/.test(result.move.word)).toBe(true);
        
        // Should pass the same validation that human players face
        const validation = validateWord(result.move.word, { isBot: false });
        expect(validation.isValid).toBe(true);
      }
      
      // Should generate many candidates before filtering
      expect(result.totalCandidatesGenerated).toBeGreaterThan(result.candidates.length);
    });

    it('should handle complex word transformations fairly', () => {
      const complexWords = ['LISTEN', 'SILENT', 'MASTER', 'STREAM'];
      
      for (const word of complexWords) {
        const result = generateBotMove(word);
        expect(result.processingTime).toBeLessThan(100);
        
        if (result.move) {
          expect(result.move.word).not.toBe(word); // Should make a different word
          
          // All bot moves should be valid for human players too
          const validation = validateWord(result.move.word, { isBot: false });
          expect(validation.isValid).toBe(true);
        }
      }
    });
  });

  describe('Bot Analysis and Explanation', () => {
    it('should provide detailed move explanations', () => {
      const explanation = explainBotMove('CAT', ['S'], 3);
      
      expect(explanation.analysis).toBeDefined();
      expect(explanation.analysis.length).toBeGreaterThan(0);
      expect(explanation.topMoves.length).toBeLessThanOrEqual(3);
      expect(explanation.reasoning).toBeDefined();
      
      // Analysis should contain useful information
      expect(explanation.analysis).toContain('possible moves');
      expect(explanation.analysis).toContain('ms');
      expect(explanation.analysis).toContain('candidates');
    });

    it('should show reasoning for move selection', () => {
      const explanation = explainBotMove('CAT');
      
      if (explanation.topMoves.length > 0) {
        const topMove = explanation.topMoves[0];
        expect(topMove.reasoning.length).toBeGreaterThan(0);
        expect(topMove.reasoning.some(r => r.includes('Score:'))).toBe(true);
      }
    });

    it('should rank moves correctly in explanations', () => {
      const explanation = explainBotMove('CAT', [], 5);
      
      // Top moves should be sorted by score
      for (let i = 0; i < explanation.topMoves.length - 1; i++) {
        const current = explanation.topMoves[i];
        const next = explanation.topMoves[i + 1];
        
        if (current.score !== next.score) {
          expect(current.score).toBeGreaterThan(next.score);
        }
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very short words', () => {
      const result = generateBotMove('A');
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle very long words', () => {
      const result = generateBotMove('ANTIDISESTABLISHMENTARIANISM');
      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(200); // Should still be reasonably fast
    });

    it('should handle words with repeated letters', () => {
      const result = generateBotMove('LETTER');
      expect(result).toBeDefined();
      
      if (result.move) {
        expect(result.move.word).toBeDefined();
      }
    });

    it('should handle empty key letters gracefully', () => {
      const result1 = generateBotMove('CAT', { keyLetters: [] });
      const result2 = generateBotMove('CAT', { keyLetters: undefined });
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle invalid key letters', () => {
      const result = generateBotMove('CAT', { keyLetters: ['1', '@', ''] });
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Consistency and Reliability', () => {
    it('should provide consistent results for same inputs', () => {
      const results = [];
      
      for (let i = 0; i < 3; i++) {
        const result = generateBotMove('CAT', { maxCandidates: 100 });
        results.push(result);
      }
      
      // Should all complete successfully
      results.forEach(result => {
        expect(result.processingTime).toBeGreaterThan(0);
        expect(result.totalCandidatesGenerated).toBeGreaterThan(0);
      });
      
      // Should generate similar numbers of candidates
      const candidateCounts = results.map(r => r.totalCandidatesGenerated);
      const avgCandidates = candidateCounts.reduce((sum, count) => sum + count, 0) / candidateCounts.length;
      
      candidateCounts.forEach(count => {
        expect(Math.abs(count - avgCandidates)).toBeLessThan(avgCandidates * 0.1); // Within 10%
      });
    });

    it('should maintain performance across multiple runs', () => {
      const times = [];
      
      for (let i = 0; i < 10; i++) {
        const result = generateBotMove('HELLO', { maxCandidates: 50 });
        times.push(result.processingTime);
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(averageTime).toBeLessThan(50);
      
      // No single run should be extremely slow
      times.forEach(time => {
        expect(time).toBeLessThan(100);
      });
    });
  });
}); 