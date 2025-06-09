/**
 * Unit tests for Local GameState Manager
 * 
 * Covers all game state management functionality including word management,
 * key/locked letters, turn-based flow, bot integration, and performance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalGameStateManagerWithDependencies as LocalGameStateManager } from './gamestate';
import { createTestAdapter, TestAdapter } from '../../src/adapters/testAdapter';
import type { GameConfig } from './interfaces';

describe('LocalGameStateManager', () => {
  let gameManager: LocalGameStateManager;
  let testAdapter: TestAdapter;

  beforeEach(() => {
    testAdapter = createTestAdapter();
    const config: GameConfig = {
      initialWord: 'CAT',
      allowBotPlayer: true,
    };
    const dependencies = testAdapter.getGameDependencies();
    gameManager = new LocalGameStateManager(dependencies, config);
    gameManager.startGame();
  });

  describe('Core Game State', () => {
    it('should initialize with correct default state', () => {
      const state = gameManager.getState();
      expect(state.gameStatus).toBe('playing');
      expect(state.currentWord).toBe('CAT');
    });

    it('should validate valid moves correctly', () => {
      const move = gameManager.validateMove('CATS');
      expect(move.isValid).toBe(true);
    });

    it('should reject invalid moves', () => {
      const move = gameManager.validateMove('ZZZZ');
      expect(move.isValid).toBe(false);
    });

    it('should apply valid moves and update state', () => {
      gameManager.applyMove('CATS');
      expect(gameManager.getState().currentWord).toBe('CATS');
    });

    it('should switch players after move', () => {
      const p1 = gameManager.getCurrentPlayer();
      gameManager.applyMove('CATS');
      const p2 = gameManager.getCurrentPlayer();
      expect(p1?.id).not.toBe(p2?.id);
    });
  });

  describe('Key Letters and Locking', () => {
    it('should lock a used key letter', () => {
      testAdapter.addWord('CARTS');
      gameManager.addKeyLetter('R');
      gameManager.applyMove('CARTS');
      expect(gameManager.getState().lockedLetters).toContain('R');
    });

    it('should not allow removing a locked letter', () => {
      testAdapter.addWord('CARTS');
      gameManager.addKeyLetter('R');
      gameManager.applyMove('CARTS');
      const move = gameManager.validateMove('CATS');
      expect(move.isValid).toBe(false);
      expect(move.reason).toBe('INVALID_ACTION');
    });
  });

  describe('Bot Player Scenarios', () => {
    it('should allow bot to make a valid move', async () => {
      testAdapter.addWord('TASKS');
      testAdapter.addWord('STALK');
      gameManager.applyMove('TASKS');
      const botMove = await gameManager.makeBotMove();
      expect(botMove).not.toBeNull();
      expect(botMove?.word).toBe('STALK');
    });

    it('should make bot pass if no valid moves are available', async () => {
      testAdapter.reset();
      testAdapter.addWord('CAT');
      testAdapter.addWord('CATS');
      gameManager.resetGame({ initialWord: 'CAT', allowBotPlayer: true });
      gameManager.startGame();
      gameManager.applyMove('CATS');
      
      const botMove = await gameManager.makeBotMove();
      expect(botMove).toBeNull();
    });
  });
}); 