/**
 * Bot Strategy Tests
 * 
 * Tests to verify different bot strategies behave correctly
 */

import { describe, it, expect } from 'vitest';
import { getBotStrategy, filterCandidatesByStrategy, BOT_STRATEGIES } from './bot-strategies';
import type { BotMove } from './interfaces';

describe('Bot Strategy System', () => {
  
  describe('getBotStrategy', () => {
    it('should return basicBot strategy for basicBot', () => {
      const strategy = getBotStrategy('basicBot');
      expect(strategy.id).toBe('basicBot');
      expect(strategy.maxPoints).toBe(2);
      expect(strategy.keyLetterBehavior).toBe('ignore');
    });

    it('should return easy-bot strategy for easy-bot', () => {
      const strategy = getBotStrategy('easy-bot');
      expect(strategy.id).toBe('easy-bot');
      expect(strategy.maxPoints).toBe(2);
      expect(strategy.keyLetterBehavior).toBe('avoid');
    });

    it('should return expert-bot strategy for expert-bot', () => {
      const strategy = getBotStrategy('expert-bot');
      expect(strategy.id).toBe('expert-bot');
      expect(strategy.minPoints).toBe(3);
      expect(strategy.maxPoints).toBe(4);
      expect(strategy.keyLetterBehavior).toBe('prioritize');
    });

    it('should fallback to basicBot for unknown bot', () => {
      const strategy = getBotStrategy('unknown-bot');
      expect(strategy.id).toBe('basicBot');
    });
  });

  describe('filterCandidatesByStrategy', () => {
    const mockCandidates: BotMove[] = [
      { word: 'CAT', score: 1, confidence: 0.8, reasoning: ['Add letter T'] },
      { word: 'CATS', score: 2, confidence: 0.9, reasoning: ['Add letter S', 'Used key letter S'] },
      { word: 'BATS', score: 3, confidence: 0.7, reasoning: ['Remove C', 'Add B', 'Move letters'] },
      { word: 'BEAST', score: 4, confidence: 0.6, reasoning: ['Remove C', 'Add B', 'Add E', 'Used key letter B'] }
    ];

    it('should filter by max points for basicBot', () => {
      const strategy = BOT_STRATEGIES['basicBot'];
      const filtered = filterCandidatesByStrategy(mockCandidates, strategy, ['S', 'B']);
      
      // Should only include moves with 1-2 points
      expect(filtered.every(move => move.score <= 2)).toBe(true);
      expect(filtered.length).toBe(2);
    });

    it('should avoid key letters for easy-bot', () => {
      const strategy = BOT_STRATEGIES['easy-bot'];
      const filtered = filterCandidatesByStrategy(mockCandidates, strategy, ['S', 'B']);
      
      // Should only include moves with 1-2 points AND no key letter usage
      expect(filtered.every(move => move.score <= 2)).toBe(true);
      expect(filtered.every(move => !move.reasoning.some(r => r.includes('key letter')))).toBe(true);
      expect(filtered.length).toBe(1); // Only CAT should remain
    });

    it('should prioritize key letters for expert-bot', () => {
      const strategy = BOT_STRATEGIES['expert-bot'];
      const filtered = filterCandidatesByStrategy(mockCandidates, strategy, ['S', 'B']);
      
      // Should only include moves with 3-4 points
      expect(filtered.every(move => move.score >= 3)).toBe(true);
      
      // Key letter moves should come first
      const firstMove = filtered[0];
      expect(firstMove.reasoning.some(r => r.includes('key letter'))).toBe(true);
    });

    it('should handle medium-bot point limits', () => {
      const strategy = BOT_STRATEGIES['medium-bot'];
      const filtered = filterCandidatesByStrategy(mockCandidates, strategy, ['S', 'B']);
      
      // Should include moves with 1-3 points
      expect(filtered.every(move => move.score <= 3)).toBe(true);
      expect(filtered.length).toBe(3); // CAT, CATS, BATS
    });
  });

  describe('All Bot Strategies', () => {
    it('should have all required bot strategies defined', () => {
      expect(BOT_STRATEGIES['basicBot']).toBeDefined();
      expect(BOT_STRATEGIES['easy-bot']).toBeDefined();
      expect(BOT_STRATEGIES['medium-bot']).toBeDefined();
      expect(BOT_STRATEGIES['hard-bot']).toBeDefined();
      expect(BOT_STRATEGIES['expert-bot']).toBeDefined();
    });

    it('should have correct point limits for all bots', () => {
      expect(BOT_STRATEGIES['basicBot'].maxPoints).toBe(2);
      expect(BOT_STRATEGIES['easy-bot'].maxPoints).toBe(2);
      expect(BOT_STRATEGIES['medium-bot'].maxPoints).toBe(3);
      expect(BOT_STRATEGIES['hard-bot'].maxPoints).toBe(4);
      expect(BOT_STRATEGIES['expert-bot'].maxPoints).toBe(4);
      expect(BOT_STRATEGIES['expert-bot'].minPoints).toBe(3);
    });
  });
}); 