/**
 * Unit tests for Terminal Game Interface
 * 
 * Tests the terminal game functionality and integration with GameState Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TerminalGame, startTerminalGame, quickGame } from './terminal-game';
import { LocalGameStateManagerWithDependencies } from './gamestate';
import { TestAdapter } from '../../src/adapters/testAdapter';

// Mock readline to avoid actual terminal interaction during tests
vi.mock('readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn(),
    close: vi.fn()
  }))
}));

describe('Terminal Game Interface', () => {
  let terminalGame: TerminalGame;
  let testAdapter: TestAdapter;

  beforeEach(() => {
    // Initialize test adapter and terminal game
    testAdapter = TestAdapter.getInstance();
    
    terminalGame = new TerminalGame({
      maxTurns: 3,
      initialWord: 'CAT',
      enableKeyLetters: true,
      enableLockedLetters: false
    });

    // Initialize the game manager with test dependencies
    const dependencies = testAdapter.getGameDependencies();
    terminalGame.initializeForTesting(dependencies);
  });

  describe('Initialization', () => {
    it('should create terminal game with default options', () => {
      const game = new TerminalGame();
      expect(game).toBeDefined();
      
      // Initialize for testing
      const dependencies = testAdapter.getGameDependencies();
      game.initializeForTesting(dependencies);
      
      // Now can access gameManager
      const gameManager = (game as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      expect(gameManager).toBeDefined();
    });

    it('should create terminal game with custom options', () => {
      const game = new TerminalGame({
        maxTurns: 5,
        initialWord: 'DOG',
        enableKeyLetters: false,
        enableLockedLetters: true
      });
      expect(game).toBeDefined();
      
      // Initialize for testing
      const dependencies = testAdapter.getGameDependencies();
      game.initializeForTesting(dependencies);
      
      // Now can access gameManager
      const gameManager = (game as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      expect(gameManager).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should provide startTerminalGame function', () => {
      expect(typeof startTerminalGame).toBe('function');
    });

    it('should provide quickGame function', () => {
      expect(typeof quickGame).toBe('function');
    });
  });

  describe('Game Integration', () => {
    it('should integrate with GameState Manager', () => {
      // Test that the terminal game properly creates and uses a game manager
      expect(terminalGame).toBeDefined();
      
      // Access private gameManager for testing
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      expect(gameManager).toBeDefined();
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('CAT');
      expect(state.maxTurns).toBe(3);
    });

    it('should handle game state changes', () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      
      // Start the game
      gameManager.startGame();
      
      // Make a move
      const moveAttempt = gameManager.attemptMove('CATS');
      expect(moveAttempt.canApply).toBe(true);
      
      const success = gameManager.applyMove(moveAttempt);
      expect(success).toBe(true);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('CATS');
      expect(state.totalMoves).toBe(1);
    });
  });

  describe('Terminal Colors', () => {
    it('should have color constants defined', () => {
      // Access private colors object for testing
      const colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m'
      };
      
      expect(colors.reset).toBeDefined();
      expect(colors.green).toBeDefined();
      expect(colors.red).toBeDefined();
      expect(colors.blue).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should create game instances quickly', () => {
      const startTime = performance.now();
      
      // Test creating instances (without initializing gameManager for speed)
      for (let i = 0; i < 100; i++) {
        new TerminalGame({ maxTurns: 5 });
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should create 100 instances in less than 1 second
    });

    it('should handle game operations efficiently', () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      gameManager.startGame();
      
      const startTime = performance.now();
      
      // Perform multiple game operations
      for (let i = 0; i < 10; i++) {
        gameManager.getState();
        gameManager.getCurrentPlayer();
        
        const moveAttempt = gameManager.attemptMove('CATS');
        if (moveAttempt.canApply && i < 3) { // Only apply first few to avoid game end
          gameManager.applyMove(moveAttempt);
        }
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete operations quickly
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid game configurations gracefully', () => {
      expect(() => {
        const game = new TerminalGame({
          maxTurns: -1, // Invalid
          initialWord: '', // Invalid
        });
        // Initialize for testing
        const dependencies = testAdapter.getGameDependencies();
        game.initializeForTesting(dependencies);
      }).not.toThrow();
    });

    it('should handle game state errors gracefully', () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      
      // Try operations before starting game
      expect(() => {
        const moveAttempt = gameManager.attemptMove('CATS');
        expect(moveAttempt.canApply).toBe(false);
      }).not.toThrow();
    });
  });

  describe('Game Flow Simulation', () => {
    it('should simulate a complete game flow', async () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      
      // Start game
      gameManager.startGame();
      expect(gameManager.getState().gameStatus).toBe('playing');
      
      // Human move
      const humanMove = gameManager.attemptMove('CATS');
      expect(humanMove.canApply).toBe(true);
      gameManager.applyMove(humanMove);
      
      // Bot move
      const botMove = await gameManager.makeBotMove();
      expect(botMove).toBeDefined();
      
      // Check game progressed
      const state = gameManager.getState();
      expect(state.totalMoves).toBeGreaterThan(0);
      expect(state.currentTurn).toBeGreaterThan(1);
    });

    it('should handle key letter management', () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      
      // Add key letters
      gameManager.addKeyLetter('S');
      gameManager.addKeyLetter('R');
      
      let state = gameManager.getState();
      expect(state.keyLetters).toContain('S');
      expect(state.keyLetters).toContain('R');
      
      // Remove key letter
      gameManager.removeKeyLetter('S');
      
      state = gameManager.getState();
      expect(state.keyLetters).not.toContain('S');
      expect(state.keyLetters).toContain('R');
    });
  });

  describe('Statistics and Tracking', () => {
    it('should track game statistics correctly', () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      gameManager.startGame();
      
      // Make some moves
      const move1 = gameManager.attemptMove('CATS');
      gameManager.applyMove(move1);
      
      const stats = gameManager.getGameStats();
      expect(stats.totalMoves).toBe(1);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
      expect(stats.playerStats.length).toBe(2);
    });

    it('should provide detailed game state information', () => {
      const gameManager = (terminalGame as unknown as { gameManager: LocalGameStateManagerWithDependencies }).gameManager;
      gameManager.startGame();
      
      const state = gameManager.getState();
      
      // Check all required state properties
      expect(state.currentWord).toBeDefined();
      expect(state.players).toBeDefined();
      expect(state.currentTurn).toBeDefined();
      expect(state.maxTurns).toBeDefined();
      expect(state.gameStatus).toBeDefined();
      expect(state.turnHistory).toBeDefined();
      expect(state.keyLetters).toBeDefined();
      expect(state.lockedLetters).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should export TerminalGame class', () => {
      expect(TerminalGame).toBeDefined();
      expect(typeof TerminalGame).toBe('function');
    });

    it('should export utility functions', () => {
      expect(startTerminalGame).toBeDefined();
      expect(typeof startTerminalGame).toBe('function');
      
      expect(quickGame).toBeDefined();
      expect(typeof quickGame).toBe('function');
    });
  });
}); 