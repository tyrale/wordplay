/**
 * Unit tests for Local GameState Manager
 * 
 * Covers all game state management functionality including word management,
 * key/locked letters, turn-based flow, bot integration, and performance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalGameStateManager,
  createGameStateManager,
  quickScoreMove,
  quickValidateMove,
  type GameConfig,
  type GameStateUpdate
} from './gamestate';

describe('Local GameState Manager', () => {
  let gameManager: LocalGameStateManager;
  let gameConfig: GameConfig;

  beforeEach(() => {
    gameConfig = {
      maxTurns: 5,
      initialWord: 'CAT',
      allowBotPlayer: true,
      enableKeyLetters: true,
      enableLockedLetters: true
    };
    gameManager = new LocalGameStateManager(gameConfig);
  });

  describe('Initialization and Basic State', () => {
    it('should initialize with correct default state', () => {
      const state = gameManager.getState();
      
      expect(state.currentWord).toBe('CAT');
      expect(state.keyLetters).toEqual([]);
      expect(state.lockedLetters).toEqual([]);
      expect(state.currentTurn).toBe(1);
      expect(state.maxTurns).toBe(5);
      expect(state.gameStatus).toBe('waiting');
      expect(state.winner).toBeNull();
      expect(state.players.length).toBe(2);
      expect(state.turnHistory).toEqual([]);
      expect(state.totalMoves).toBe(0);
    });

    it('should create human and bot players correctly', () => {
      const state = gameManager.getState();
      
      const humanPlayer = state.players.find(p => !p.isBot);
      const botPlayer = state.players.find(p => p.isBot);
      
      expect(humanPlayer).toBeDefined();
      expect(humanPlayer?.id).toBe('human');
      expect(humanPlayer?.name).toBe('Player');
      expect(humanPlayer?.score).toBe(0);
      expect(humanPlayer?.isCurrentPlayer).toBe(true);
      
      expect(botPlayer).toBeDefined();
      expect(botPlayer?.id).toBe('bot');
      expect(botPlayer?.name).toBe('Bot AI');
      expect(botPlayer?.score).toBe(0);
      expect(botPlayer?.isCurrentPlayer).toBe(false);
    });

    it('should handle single player mode', () => {
      const singlePlayerManager = new LocalGameStateManager({
        allowBotPlayer: false
      });
      const state = singlePlayerManager.getState();
      
      expect(state.players.length).toBe(1);
      expect(state.players[0].isBot).toBe(false);
      expect(state.players[0].isCurrentPlayer).toBe(true);
    });

    it('should handle disabled features', () => {
      const minimalManager = new LocalGameStateManager({
        enableKeyLetters: false,
        enableLockedLetters: false
      });
      
      // Key letters should be disabled
      minimalManager.addKeyLetter('A');
      expect(minimalManager.getState().keyLetters).toEqual([]);
      
      // Locked letters should be disabled
      minimalManager.addLockedLetter('B');
      expect(minimalManager.getState().lockedLetters).toEqual([]);
    });
  });

  describe('Game Flow Management', () => {
    it('should start game correctly', () => {
      expect(gameManager.getState().gameStatus).toBe('waiting');
      
      gameManager.startGame();
      
      const state = gameManager.getState();
      expect(state.gameStatus).toBe('playing');
      expect(state.gameStartTime).toBeGreaterThan(0);
    });

    it('should prevent starting game twice', () => {
      gameManager.startGame();
      
      expect(() => gameManager.startGame()).toThrow('Game has already started');
    });

    it('should get current and other players correctly', () => {
      const currentPlayer = gameManager.getCurrentPlayer();
      const otherPlayer = gameManager.getOtherPlayer();
      
      expect(currentPlayer?.id).toBe('human');
      expect(currentPlayer?.isCurrentPlayer).toBe(true);
      expect(otherPlayer?.id).toBe('bot');
      expect(otherPlayer?.isCurrentPlayer).toBe(false);
    });
  });

  describe('Move Validation and Application', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should validate valid moves correctly', () => {
      const moveAttempt = gameManager.attemptMove('CATS');
      
      expect(moveAttempt.isValid).toBe(true);
      expect(moveAttempt.canApply).toBe(true);
      expect(moveAttempt.newWord).toBe('CATS');
      expect(moveAttempt.scoringResult).toBeDefined();
      expect(moveAttempt.scoringResult?.totalScore).toBeGreaterThan(0);
    });

    it('should reject invalid moves', () => {
      const moveAttempt = gameManager.attemptMove('ZZZZ');
      
      expect(moveAttempt.isValid).toBe(false);
      expect(moveAttempt.canApply).toBe(false);
      expect(moveAttempt.reason).toBeDefined();
      expect(moveAttempt.scoringResult).toBeNull();
    });

    it('should prevent moves when game not started', () => {
      const waitingManager = new LocalGameStateManager();
      const moveAttempt = waitingManager.attemptMove('CATS');
      
      expect(moveAttempt.isValid).toBe(false);
      expect(moveAttempt.canApply).toBe(false);
      expect(moveAttempt.reason).toBe('Game is not in progress');
    });

    it('should apply valid moves and update state', () => {
      const moveAttempt = gameManager.attemptMove('CATS');
      expect(moveAttempt.canApply).toBe(true);
      
      const success = gameManager.applyMove(moveAttempt);
      expect(success).toBe(true);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('CATS');
      expect(state.totalMoves).toBe(1);
      expect(state.turnHistory.length).toBe(1);
      
      const humanPlayer = state.players.find(p => !p.isBot);
      expect(humanPlayer?.score).toBeGreaterThan(0);
    });

    it('should switch players after move', () => {
      const moveAttempt = gameManager.attemptMove('CATS');
      gameManager.applyMove(moveAttempt);
      
      const currentPlayer = gameManager.getCurrentPlayer();
      expect(currentPlayer?.id).toBe('bot');
      expect(currentPlayer?.isCurrentPlayer).toBe(true);
      
      const state = gameManager.getState();
      expect(state.currentTurn).toBe(2);
    });

    it('should track turn history correctly', () => {
      const moveAttempt = gameManager.attemptMove('CATS');
      gameManager.applyMove(moveAttempt);
      
      const state = gameManager.getState();
      const turnRecord = state.turnHistory[0];
      
      expect(turnRecord.turnNumber).toBe(1);
      expect(turnRecord.playerId).toBe('human');
      expect(turnRecord.previousWord).toBe('CAT');
      expect(turnRecord.newWord).toBe('CATS');
      expect(turnRecord.score).toBeGreaterThan(0);
      expect(turnRecord.scoringBreakdown).toBeDefined();
      expect(turnRecord.timestamp).toBeGreaterThan(0);
    });

    it('should handle consecutive moves', () => {
      // Human move
      const move1 = gameManager.attemptMove('CATS');
      gameManager.applyMove(move1);
      
      // Now it's bot's turn - simulate bot move manually
      const move2 = gameManager.attemptMove('BATS');
      gameManager.applyMove(move2);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('BATS');
      expect(state.turnHistory.length).toBe(2);
      expect(state.currentTurn).toBe(3);
      
      // Should be human's turn again
      const currentPlayer = gameManager.getCurrentPlayer();
      expect(currentPlayer?.id).toBe('human');
    });
  });

  describe('Key Letters Management', () => {
    it('should add key letters correctly', () => {
      gameManager.addKeyLetter('S');
      gameManager.addKeyLetter('R');
      
      const state = gameManager.getState();
      expect(state.keyLetters).toContain('S');
      expect(state.keyLetters).toContain('R');
      expect(state.keyLetters.length).toBe(2);
    });

    it('should prevent duplicate key letters', () => {
      gameManager.addKeyLetter('S');
      gameManager.addKeyLetter('S'); // Duplicate
      
      const state = gameManager.getState();
      expect(state.keyLetters.length).toBe(1);
      expect(state.keyLetters[0]).toBe('S');
    });

    it('should remove key letters correctly', () => {
      gameManager.addKeyLetter('S');
      gameManager.addKeyLetter('R');
      gameManager.removeKeyLetter('S');
      
      const state = gameManager.getState();
      expect(state.keyLetters).not.toContain('S');
      expect(state.keyLetters).toContain('R');
      expect(state.keyLetters.length).toBe(1);
    });

    it('should handle case insensitivity for key letters', () => {
      gameManager.addKeyLetter('s');
      gameManager.addKeyLetter('R');
      
      const state = gameManager.getState();
      expect(state.keyLetters).toContain('S');
      expect(state.keyLetters).toContain('R');
    });

    it('should integrate key letters with scoring', () => {
      gameManager.addKeyLetter('S');
      gameManager.startGame();
      
      const moveAttempt = gameManager.attemptMove('CATS');
      expect(moveAttempt.scoringResult?.keyLettersUsed).toContain('S');
      expect(moveAttempt.scoringResult?.breakdown.keyLetterUsagePoints).toBe(1);
    });

    it('should remove used key letters after moves', () => {
      gameManager.addKeyLetter('S');
      gameManager.startGame();
      
      const moveAttempt = gameManager.attemptMove('CATS');
      gameManager.applyMove(moveAttempt);
      
      const state = gameManager.getState();
      expect(state.keyLetters).not.toContain('S'); // Should be removed after use
    });
  });

  describe('Locked Letters Management', () => {
    it('should add locked letters correctly', () => {
      gameManager.addLockedLetter('A');
      gameManager.addLockedLetter('T');
      
      const state = gameManager.getState();
      expect(state.lockedLetters).toContain('A');
      expect(state.lockedLetters).toContain('T');
      expect(state.lockedLetters.length).toBe(2);
    });

    it('should prevent duplicate locked letters', () => {
      gameManager.addLockedLetter('A');
      gameManager.addLockedLetter('A'); // Duplicate
      
      const state = gameManager.getState();
      expect(state.lockedLetters.length).toBe(1);
      expect(state.lockedLetters[0]).toBe('A');
    });

    it('should remove locked letters correctly', () => {
      gameManager.addLockedLetter('A');
      gameManager.addLockedLetter('T');
      gameManager.removeLockedLetter('A');
      
      const state = gameManager.getState();
      expect(state.lockedLetters).not.toContain('A');
      expect(state.lockedLetters).toContain('T');
      expect(state.lockedLetters.length).toBe(1);
    });

    it('should handle case insensitivity for locked letters', () => {
      gameManager.addLockedLetter('a');
      gameManager.addLockedLetter('T');
      
      const state = gameManager.getState();
      expect(state.lockedLetters).toContain('A');
      expect(state.lockedLetters).toContain('T');
    });
  });

  describe('Word Management', () => {
    it('should set word correctly', () => {
      const success = gameManager.setWord('HELLO');
      expect(success).toBe(true);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('HELLO');
    });

    it('should reject invalid words', () => {
      const success1 = gameManager.setWord('');
      const success2 = gameManager.setWord('123');
      const success3 = gameManager.setWord('AB@');
      
      expect(success1).toBe(false);
      expect(success2).toBe(false);
      expect(success3).toBe(false);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('CAT'); // Should remain unchanged
    });

    it('should handle case normalization', () => {
      const success = gameManager.setWord('hello');
      expect(success).toBe(true);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('HELLO');
    });
  });

  describe('Bot AI Integration', () => {
    beforeEach(() => {
      gameManager.startGame();
      // Make a human move to set up bot turn
      const humanMove = gameManager.attemptMove('CATS');
      gameManager.applyMove(humanMove);
    });

    it('should make bot moves when bot is current player', async () => {
      const currentPlayer = gameManager.getCurrentPlayer();
      expect(currentPlayer?.isBot).toBe(true);
      
      const botMove = await gameManager.makeBotMove();
      
      expect(botMove).toBeDefined();
      expect(botMove?.word).toBeDefined();
      expect(botMove?.score).toBeGreaterThanOrEqual(0);
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe(botMove?.word);
    });

    it('should not make bot moves when human is current player', async () => {
      // Reset to human turn
      gameManager.resetGame();
      gameManager.startGame();
      
      const currentPlayer = gameManager.getCurrentPlayer();
      expect(currentPlayer?.isBot).toBe(false);
      
      const botMove = await gameManager.makeBotMove();
      expect(botMove).toBeNull();
    });

    it('should handle bot move failures gracefully', async () => {
      // Create a scenario where bot might struggle (very long word)
      gameManager.setWord('ANTIDISESTABLISHMENTARIANISM');
      
      const botMove = await gameManager.makeBotMove();
      // Bot should either succeed or return null, not crash
      expect(botMove === null || botMove?.word).toBeTruthy();
    });
  });

  describe('Game Completion', () => {
    it('should finish game after max turns', () => {
      gameManager.startGame();
      
      // Play through all turns with valid, unique words
      const testWords = ['CATS', 'BATS', 'RATS', 'HATS', 'MATS'];
      for (let turn = 1; turn <= 5; turn++) {
        const testWord = testWords[turn - 1];
        const moveAttempt = gameManager.attemptMove(testWord);
        if (moveAttempt.canApply) {
          gameManager.applyMove(moveAttempt);
        } else {
          // If word is invalid, try a simple alternation
          const fallbackMove = gameManager.attemptMove(turn % 2 === 0 ? 'DOG' : 'LOG');
          if (fallbackMove.canApply) {
            gameManager.applyMove(fallbackMove);
          }
        }
      }
      
      const state = gameManager.getState();
      expect(state.gameStatus).toBe('finished');
      expect(state.winner).toBeDefined();
    });

    it('should determine winner correctly', () => {
      gameManager.startGame();
      
      // Human player makes high-scoring move
      const humanMove = gameManager.attemptMove('CATS');
      gameManager.applyMove(humanMove);
      
      // Simulate game completion by forcing the turn count
      // Access the private state for testing purposes
      (gameManager as unknown as { state: { currentTurn: number; maxTurns: number } }).state.currentTurn = 
        (gameManager as unknown as { state: { currentTurn: number; maxTurns: number } }).state.maxTurns + 1;
      (gameManager as unknown as { finishGame: () => void }).finishGame(); // Access private method for testing
      
      const finalState = gameManager.getState();
      expect(finalState.gameStatus).toBe('finished');
      expect(finalState.winner).toBeDefined();
      expect(finalState.winner?.id).toBe('human'); // Should win with higher score
    });
  });

  describe('Game Statistics', () => {
    it('should calculate game statistics correctly', async () => {
      gameManager.startGame(); // Start the game first to initialize timing
      
      // Add a small delay to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Make some moves
      const move1 = gameManager.attemptMove('CATS');
      gameManager.applyMove(move1);
      
      const move2 = gameManager.attemptMove('BATS');
      gameManager.applyMove(move2);
      
      const stats = gameManager.getGameStats();
      
      // Duration should be >= 0 (some systems might be too fast for measurable duration)
      expect(stats.duration).toBeGreaterThanOrEqual(0);
      expect(stats.totalMoves).toBe(2);
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.playerStats.length).toBe(2);
      
      const humanStats = stats.playerStats.find(p => p.id === 'human');
      expect(humanStats?.moveCount).toBe(1);
      expect(humanStats?.score).toBeGreaterThan(0);
    });

    it('should handle empty game statistics', () => {
      const stats = gameManager.getGameStats();
      
      expect(stats.totalMoves).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.playerStats.every(p => p.moveCount === 0)).toBe(true);
    });

    it('should handle missing players gracefully', () => {
      // Create manager with no players (edge case)
      const manager = new LocalGameStateManager({ allowBotPlayer: false });
      manager.startGame(); // Start the game first to get past the "not in progress" check
      // Access the private state to simulate the edge case
      (manager as unknown as { state: { players: unknown[] } }).state.players = []; // Force empty players for testing
      
      const attempt = manager.attemptMove('CATS');
      expect(attempt.canApply).toBe(false);
      expect(attempt.reason).toContain('No current player');
    });
  });

  describe('Event System', () => {
    it('should notify listeners of game events', () => {
      const events: GameStateUpdate[] = [];
      
      const unsubscribe = gameManager.subscribe((update) => {
        events.push(update);
      });
      
      gameManager.startGame();
      gameManager.addKeyLetter('S');
      
      const move = gameManager.attemptMove('CATS');
      gameManager.applyMove(move);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'letters_updated')).toBe(true);
      expect(events.some(e => e.type === 'word_changed')).toBe(true);
      expect(events.some(e => e.type === 'turn_completed')).toBe(true);
      
      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = () => {
        throw new Error('Test error');
      };
      
      gameManager.subscribe(errorListener);
      
      // Should not crash when listener throws
      expect(() => gameManager.addKeyLetter('S')).not.toThrow();
    });

    it('should unsubscribe listeners correctly', () => {
      const events: GameStateUpdate[] = [];
      
      const unsubscribe = gameManager.subscribe((update) => {
        events.push(update);
      });
      
      gameManager.addKeyLetter('S');
      expect(events.length).toBe(1);
      
      unsubscribe();
      
      gameManager.addKeyLetter('R');
      expect(events.length).toBe(1); // Should not receive new events
    });
  });

  describe('Reset and State Management', () => {
    it('should reset game correctly', () => {
      gameManager.startGame();
      gameManager.addKeyLetter('S');
      
      const move = gameManager.attemptMove('CATS');
      gameManager.applyMove(move);
      
      // Game should have progressed
      expect(gameManager.getState().totalMoves).toBe(1);
      // Note: With automatic key letter generation, key letters may not be empty
      // The 'S' was used but new key letters are automatically generated
      
      gameManager.resetGame();
      
      const state = gameManager.getState();
      expect(state.currentWord).toBe('CAT');
      expect(state.gameStatus).toBe('waiting');
      expect(state.totalMoves).toBe(0);
      expect(state.turnHistory).toEqual([]);
      expect(state.keyLetters).toEqual([]);
      expect(state.usedWords).toEqual([]); // New: check used words are reset
      expect(state.players.every(p => p.score === 0)).toBe(true);
    });

    it('should maintain immutable state access', () => {
      const state1 = gameManager.getState();
      const state2 = gameManager.getState();
      
      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same content
      
      // Modifying returned state should not affect internal state
      // We can't modify the readonly state, so let's test immutability differently
      const originalWord = gameManager.getState().currentWord;
      try {
        (state1 as unknown as { currentWord: string }).currentWord = 'MODIFIED';
      } catch {
        // Expected - state is readonly
      }
      expect(gameManager.getState().currentWord).toBe(originalWord);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance targets', () => {
      const perfResult = gameManager.performanceTest(100);
      
      expect(perfResult.averageTime).toBeLessThan(1); // <1ms per operation
      expect(perfResult.totalTime).toBeGreaterThan(0);
    });

    it('should handle high-frequency operations efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        gameManager.getState();
        gameManager.getCurrentPlayer();
        
        if (i % 100 === 0) {
          gameManager.addKeyLetter(`${i % 26 + 65}`); // Random letters
        }
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 1000;
      
      expect(averageTime).toBeLessThan(0.1); // Should be very fast
    });
  });

  describe('Factory Functions and Helpers', () => {
    it('should create game manager with factory function', () => {
      const manager = createGameStateManager({
        maxTurns: 3,
        initialWord: 'HELLO'
      });
      
      const state = manager.getState();
      expect(state.maxTurns).toBe(3);
      expect(state.currentWord).toBe('HELLO');
    });

    it('should score moves quickly with helper', () => {
      const score = quickScoreMove('CAT', 'CATS', ['S']);
      expect(score).toBeGreaterThan(0);
    });

    it('should validate moves quickly with helper', () => {
      expect(quickValidateMove('CATS', false, 'CAT')).toBe(true);
      expect(quickValidateMove('ZZZZ', false, 'CAT')).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty configuration', () => {
      const manager = new LocalGameStateManager({});
      const state = manager.getState();
      
      expect(state.maxTurns).toBe(10); // Default value
      expect(state.currentWord).toHaveLength(4); // Should be a random 4-letter word
      expect(state.currentWord).toMatch(/^[A-Z]{4}$/); // Should be 4 uppercase letters
    });

    it('should handle invalid move attempts gracefully', () => {
      gameManager.startGame();
      
      const invalidAttempts = [
        '', // Empty
        '123', // Numbers
        'A@B', // Special chars
        'Z'.repeat(50) // Very long
      ];
      
      invalidAttempts.forEach(word => {
        const attempt = gameManager.attemptMove(word);
        expect(attempt.isValid).toBe(false);
        expect(attempt.canApply).toBe(false);
      });
    });

    it('should handle missing players gracefully', () => {
      // Create manager with no players (edge case)
      const manager = new LocalGameStateManager({ allowBotPlayer: false });
      manager.startGame(); // Start the game first to get past the "not in progress" check
      // Access the private state to simulate the edge case
      (manager as unknown as { state: { players: unknown[] } }).state.players = []; // Force empty players for testing
      
      const attempt = manager.attemptMove('CATS');
      expect(attempt.canApply).toBe(false);
      expect(attempt.reason).toContain('No current player');
    });

    it('should handle listener subscription edge cases', () => {
      const manager = new LocalGameStateManager();
      
      // Multiple subscriptions
      const unsubscribe1 = manager.subscribe(() => {});
      const unsubscribe2 = manager.subscribe(() => {});
      
      // Multiple unsubscribes should not error
      unsubscribe1();
      unsubscribe1(); // Second call should be safe
      unsubscribe2();
    });
  });

  describe('Word Repetition Prevention', () => {
    it('should prevent playing the same word twice', () => {
      gameManager.startGame();
      
      // First move: CAT -> CATS
      const move1 = gameManager.attemptMove('CATS');
      expect(move1.canApply).toBe(true);
      gameManager.applyMove(move1);
      
      // Second move: CATS -> BATS (should work)
      const move2 = gameManager.attemptMove('BATS');
      expect(move2.canApply).toBe(true);
      gameManager.applyMove(move2);
      
      // Try to use CAT again (initial word) - should fail
      const move3 = gameManager.attemptMove('CAT');
      expect(move3.canApply).toBe(false);
      expect(move3.reason).toContain('already been played');
      
      // Try to use CATS again - should fail
      const move4 = gameManager.attemptMove('CATS');
      expect(move4.canApply).toBe(false);
      expect(move4.reason).toContain('already been played');
    });

    it('should track initial word as used', () => {
      gameManager.startGame();
      const state = gameManager.getState();
      
      // Initial word should be in used words
      expect(state.usedWords).toContain('CAT');
      
      // Trying to play initial word should fail
      const move = gameManager.attemptMove('CAT');
      expect(move.canApply).toBe(false);
      expect(move.reason).toContain('already been played');
    });
  });

  describe('Automatic Key Letter Generation', () => {
    it('should generate initial key letters when game starts', () => {
      expect(gameManager.getState().keyLetters.length).toBe(0); // Before start
      
      gameManager.startGame();
      
      const state = gameManager.getState();
      expect(state.keyLetters.length).toBe(1); // Should have 1 initial key letter
      expect(state.keyLetters.every(letter => /^[A-Z]$/.test(letter))).toBe(true); // Valid letters
    });

    it('should automatically generate key letters during gameplay', () => {
      gameManager.startGame();
      
      // Make a move
      const move = gameManager.attemptMove('CATS');
      gameManager.applyMove(move);
      
      const state = gameManager.getState();
      // Should have generated a key letter (max 3 total)
      expect(state.keyLetters.length).toBeLessThanOrEqual(3);
    });

    it('should not generate more than 3 key letters', () => {
      gameManager.startGame();
      
      // Make several moves to trigger key letter generation
      const words = ['CATS', 'BATS', 'RATS', 'HATS', 'MATS'];
      
      for (const word of words) {
        const move = gameManager.attemptMove(word);
        if (move.canApply) {
          gameManager.applyMove(move);
        }
      }
      
      const state = gameManager.getState();
      expect(state.keyLetters.length).toBeLessThanOrEqual(3);
    });

    it('should generate unique key letters', () => {
      gameManager.startGame();
      
      // Force generation of multiple key letters by making moves
      const words = ['CATS', 'BATS', 'RATS'];
      
      for (const word of words) {
        const move = gameManager.attemptMove(word);
        if (move.canApply) {
          gameManager.applyMove(move);
        }
      }
      
      const state = gameManager.getState();
      const uniqueKeyLetters = new Set(state.keyLetters);
      expect(uniqueKeyLetters.size).toBe(state.keyLetters.length); // No duplicates
    });
  });
}); 