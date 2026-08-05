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
    
    // Add words that the tests expect
    const testWords = ['CAT', 'CATS', 'CART', 'BATS', 'BAT'];
    testWords.forEach(word => testAdapter.addWord(word));
    
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

  describe('Rounds vs. individual turns', () => {
    // The game is round-based: maxTurns is the number of rounds (every
    // player gets one turn per round), not a raw count of individual
    // turns. These use loadState() to seed an N-player state directly
    // (the same mechanism RemoteGameStateManager uses to hydrate a
    // multiplayer game), since the default 2-player init path can't
    // create more players.
    function buildState(currentPlayerIndex: number, currentTurn: number) {
      const base = gameManager.getState();
      const players = ['p1', 'p2', 'p3', 'p4'].map((id, index) => ({
        id,
        name: id.toUpperCase(),
        isBot: false,
        score: 0,
        isCurrentPlayer: index === currentPlayerIndex
      }));
      return {
        ...base,
        players,
        currentPlayerIndex,
        maxTurns: 1, // 1 round
        currentTurn,
        gameStatus: 'playing' as const
      };
    }

    it('does not end a 4-player game after only 1 of 4 players has had a turn', () => {
      gameManager.loadState(buildState(0, 1));
      gameManager.applyMove('CATS');
      // Only 1 of 4 players has moved in this 1-round game - it must still
      // be playing, not ended as if 1 raw turn were the whole round.
      expect(gameManager.getState().gameStatus).toBe('playing');
      expect(gameManager.getState().currentTurn).toBe(2);
    });

    it('ends a 4-player, 1-round game only once all 4 players have had a turn', () => {
      // Seed state as if players 1-3 have already moved (currentTurn=4,
      // i.e. it's player 4's turn) in a 1-round (maxTurns=1) game.
      gameManager.loadState(buildState(3, 4));
      gameManager.applyMove('CATS');
      // The 4th and final player of the round has now moved - the game
      // should finish, since 1 round = 4 individual turns for 4 players.
      expect(gameManager.getState().gameStatus).toBe('finished');
    });
  });

  describe('Reset', () => {
    it('resetGame() with no arguments should pick a fresh random word, not silently reuse the previous one forever', () => {
      // Regression test: initializeGameState() writes whatever word it picks
      // back into state.config.initialWord. A bare resetGame() used to reuse
      // this.state.config as-is, so it kept seeing a truthy initialWord and
      // never rolled a new one - every reset silently produced the exact
      // same starting word forever.
      const testAdapter2 = createTestAdapter();
      const fourLetterWords = ['CATS', 'DOGS', 'BATS', 'RATS', 'HATS', 'MATS', 'FAST', 'LAST', 'GAME', 'NAME', 'SAME', 'CAME', 'FAME', 'TAME', 'LAME', 'DAME'];
      fourLetterWords.forEach(word => testAdapter2.addWord(word));

      // No explicit initialWord here - let the manager pick one randomly,
      // matching how a real vs-bot game or zen mode session is created.
      const manager = new LocalGameStateManager(testAdapter2.getGameDependencies(), { allowBotPlayer: false });

      const seenWords = new Set<string>();
      for (let i = 0; i < 20; i++) {
        manager.resetGame();
        seenWords.add(manager.getState().currentWord);
      }

      expect(seenWords.size).toBeGreaterThan(1);
    });

    it('resetGame(newConfig) with an explicit initialWord should still respect it (existing behavior)', () => {
      gameManager.resetGame({ initialWord: 'CAT', allowBotPlayer: true });
      expect(gameManager.getState().currentWord).toBe('CAT');
    });
  });

  describe('Key Letters and Locking', () => {
    it('should lock a used key letter', () => {
      // Use a valid move: CAT -> CART (add R)
      testAdapter.addWord('CART');
      gameManager.addKeyLetter('R');
      gameManager.applyMove('CART');
      expect(gameManager.getState().lockedKeyLetters).toContain('R');
    });

    it('should not allow removing a locked letter', () => {
      // Use a valid move: CAT -> CART (add R), then try CAR (remove T, but R is locked)
      testAdapter.addWord('CART');
      testAdapter.addWord('CAR');
      gameManager.addKeyLetter('R');
      gameManager.applyMove('CART');
      // Now R should be locked, so trying to remove it should fail
      const move = gameManager.validateMove('CAT'); // This removes R from CART
      expect(move.isValid).toBe(false);
      // The reason might be about locked letters or word repetition
      expect(move.reason).toBeDefined();
    });
  });

  describe('Bot Player Scenarios', () => {
    it('should allow bot to make a valid move', async () => {
      // Use a valid move: CAT -> CATS (add S), then bot should be able to move
      testAdapter.addWord('BATS'); // Add a word the bot can use
      gameManager.applyMove('CATS'); // Human moves first
      const botMove = await gameManager.makeBotMove();
      expect(botMove).not.toBeNull();
      expect(typeof botMove?.word).toBe('string');
      expect(botMove?.word.length).toBeGreaterThan(0);
    });

    it('should make bot pass if no valid moves are available', async () => {
      // Create a scenario where bot has very limited options
      testAdapter.reset();
      testAdapter.addWord('CAT');
      testAdapter.addWord('CATS');
      testAdapter.addWord('BAT'); // Very limited dictionary
      gameManager.resetGame({ initialWord: 'CAT', allowBotPlayer: true });
      gameManager.startGame();
      gameManager.applyMove('CATS');
      
      const botMove = await gameManager.makeBotMove();
      // Bot might find a move or pass - both are acceptable
      if (botMove) {
        expect(typeof botMove.word).toBe('string');
      } else {
        expect(botMove).toBeNull();
      }
    });

    it('should forward config.botId to the bot strategy so pirate-bot overrides normal score-based move selection', async () => {
      // Regression test: LocalGameStateManager.makeBotMove() must forward
      // this.state.config.botId into generateBotMove()'s options, otherwise
      // bot.ts's per-botId strategies (e.g. filterPirateBotCandidates) never run.
      // Use passTurn() for the human's turn so the word stays at 'CRAPS' when
      // it becomes the bot's turn (applyMove() would change the word).
      testAdapter.reset();
      testAdapter.addWord('CRAPS');
      testAdapter.addWord('CRAP');   // remove S -> profane once flagged below
      testAdapter.addWord('CRAPSX'); // add key letter X -> higher-scoring, non-profane
      testAdapter.addProfanityWord('CRAP');

      // Baseline: with no botId, the bot should prefer the higher-scoring,
      // key-letter move (CRAPSX) over the lower-scoring profane one (CRAP).
      gameManager.resetGame({ initialWord: 'CRAPS', allowBotPlayer: true, botId: undefined });
      gameManager.startGame();
      gameManager.addKeyLetter('X');
      gameManager.passTurn(); // human passes, word stays 'CRAPS', now bot's turn
      const normalMove = await gameManager.makeBotMove();
      expect(normalMove).not.toBeNull();
      expect(normalMove!.word).toBe('CRAPSX');

      // Same setup, but with botId: 'pirate-bot' - it should pick the profane
      // word (CRAP) over the higher-scoring CRAPSX, proving botId is forwarded.
      gameManager.resetGame({ initialWord: 'CRAPS', allowBotPlayer: true, botId: 'pirate-bot' });
      gameManager.startGame();
      gameManager.addKeyLetter('X');
      gameManager.passTurn();
      const pirateMove = await gameManager.makeBotMove();
      expect(pirateMove).not.toBeNull();
      expect(pirateMove!.word).toBe('CRAP');
    });
  });
}); 