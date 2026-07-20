/**
 * Unit tests for RemoteGameStateManager (async vs-human multiplayer)
 *
 * Uses a fake in-memory `RemoteGameDependencies` implementation instead of
 * a real Supabase backend, so these tests run fully offline/deterministically.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RemoteGameStateManager } from './remoteGamestate';
import { createTestAdapter, TestAdapter } from '../../src/adapters/testAdapter';
import type {
  RemoteGameDependencies,
  RemoteGameSnapshot,
  RemoteGameTurnRecord,
  RemoteGameUpdatedFields
} from './interfaces';

/**
 * A minimal, shared in-memory "server" used by both fake dependency
 * instances below, so we can simulate two players' managers seeing the
 * same underlying game.
 */
class FakeRemoteGameStore {
  public snapshot: RemoteGameSnapshot;
  private listeners: Array<() => void> = [];

  constructor(initial: RemoteGameSnapshot) {
    this.snapshot = initial;
  }

  fetchGame(): RemoteGameSnapshot {
    // Return a deep-ish copy so callers can't mutate our internal state.
    return {
      ...this.snapshot,
      usedWords: [...this.snapshot.usedWords],
      keyLetters: [...this.snapshot.keyLetters],
      lockedLetters: [...this.snapshot.lockedLetters],
      lockedKeyLetters: [...this.snapshot.lockedKeyLetters],
      players: this.snapshot.players.map(p => ({ ...p })),
      turnHistory: this.snapshot.turnHistory.map(t => ({ ...t }))
    };
  }

  persistMove(turn: RemoteGameTurnRecord, updatedFields: RemoteGameUpdatedFields): void {
    this.snapshot.turnHistory.push(turn);
    this.snapshot.currentWord = updatedFields.currentWord;
    this.snapshot.keyLetters = updatedFields.keyLetters;
    this.snapshot.lockedLetters = updatedFields.lockedLetters;
    this.snapshot.lockedKeyLetters = updatedFields.lockedKeyLetters;
    this.snapshot.usedWords = updatedFields.usedWords;
    this.snapshot.currentTurn = updatedFields.currentTurn;
    this.snapshot.currentPlayerIndex = updatedFields.currentPlayerIndex;
    this.snapshot.status = updatedFields.status;
    this.snapshot.winnerId = updatedFields.winnerId;

    const player = this.snapshot.players.find(p => p.id === turn.playerId);
    if (player) player.score += turn.scoreEarned;

    this.listeners.forEach(l => l());
  }

  abandon(): void {
    this.snapshot.status = 'abandoned';
    this.listeners.forEach(l => l());
  }

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

function createFakeDependencies(store: FakeRemoteGameStore, localPlayerId: string): RemoteGameDependencies {
  return {
    getLocalPlayerId: () => localPlayerId,
    fetchGame: async () => store.fetchGame(),
    persistMove: async (_gameId, turn, updatedFields) => {
      store.persistMove(turn, updatedFields);
    },
    subscribeToGame: (_gameId, onChange) => store.onChange(onChange),
    abandonGame: async () => {
      store.abandon();
    }
  };
}

describe('RemoteGameStateManager', () => {
  let testAdapter: TestAdapter;
  let store: FakeRemoteGameStore;

  const PLAYER_A = 'user-a';
  const PLAYER_B = 'user-b';

  beforeEach(() => {
    testAdapter = createTestAdapter();
    ['CAT', 'CATS', 'CART', 'BATS', 'BAT'].forEach(word => testAdapter.addWord(word));

    store = new FakeRemoteGameStore({
      gameId: 'game-1',
      status: 'active',
      currentWord: 'CAT',
      usedWords: ['CAT'],
      keyLetters: [],
      lockedLetters: [],
      lockedKeyLetters: [],
      currentTurn: 1,
      currentPlayerIndex: 0,
      maxTurns: 20,
      players: [
        { id: PLAYER_A, name: 'Alice', playerIndex: 0, score: 0 },
        { id: PLAYER_B, name: 'Bob', playerIndex: 1, score: 0 }
      ],
      turnHistory: [],
      winnerId: null
    });
  });

  it('hydrates local state from the remote snapshot on initialize()', async () => {
    const deps = createFakeDependencies(store, PLAYER_A);
    const manager = new RemoteGameStateManager(testAdapter.getGameDependencies(), deps, 'game-1');
    await manager.initialize();

    const state = manager.getState();
    expect(state.currentWord).toBe('CAT');
    expect(state.gameStatus).toBe('playing');
    expect(state.players.map(p => p.id)).toEqual([PLAYER_A, PLAYER_B]);
    expect(state.players[0].isCurrentPlayer).toBe(true);

    manager.dispose();
  });

  it('applies a valid move locally and persists it to the remote store', async () => {
    const deps = createFakeDependencies(store, PLAYER_A);
    const manager = new RemoteGameStateManager(testAdapter.getGameDependencies(), deps, 'game-1');
    await manager.initialize();

    const success = manager.applyMove('CATS');
    expect(success).toBe(true);
    expect(manager.getState().currentWord).toBe('CATS');

    // Allow the fire-and-forget persistMove() promise to resolve.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.snapshot.currentWord).toBe('CATS');
    expect(store.snapshot.turnHistory.length).toBe(1);
    expect(store.snapshot.turnHistory[0].playerId).toBe(PLAYER_A);

    manager.dispose();
  });

  it('reconciles local state when the remote store changes (opponent move)', async () => {
    const deps = createFakeDependencies(store, PLAYER_A);
    const manager = new RemoteGameStateManager(testAdapter.getGameDependencies(), deps, 'game-1');
    await manager.initialize();

    // Simulate the opponent (player B) making a move directly on the store.
    store.persistMove(
      {
        turnNumber: 1,
        playerId: PLAYER_B,
        previousWord: 'CAT',
        newWord: 'BAT',
        scoreEarned: 1,
        keyLetterUsed: null,
        timestamp: Date.now()
      },
      {
        currentWord: 'BAT',
        keyLetters: [],
        lockedLetters: [],
        lockedKeyLetters: [],
        usedWords: ['CAT', 'BAT'],
        currentTurn: 2,
        currentPlayerIndex: 0,
        status: 'active',
        winnerId: null
      }
    );

    // The store's onChange listeners (registered via subscribeToGame) fire
    // synchronously, but the manager's refresh is async - flush microtasks.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(manager.getState().currentWord).toBe('BAT');
    expect(manager.getState().turnHistory.length).toBe(1);

    manager.dispose();
  });

  it('resign() marks the game abandoned', async () => {
    const deps = createFakeDependencies(store, PLAYER_A);
    const manager = new RemoteGameStateManager(testAdapter.getGameDependencies(), deps, 'game-1');
    await manager.initialize();

    await manager.resign();

    expect(manager.getState().gameStatus).toBe('finished');
    expect(store.snapshot.status).toBe('abandoned');

    manager.dispose();
  });

  it('has no bot behavior (makeBotMove is a no-op)', async () => {
    const deps = createFakeDependencies(store, PLAYER_A);
    const manager = new RemoteGameStateManager(testAdapter.getGameDependencies(), deps, 'game-1');
    await manager.initialize();

    const result = await manager.makeBotMove();
    expect(result).toBeNull();

    manager.dispose();
  });
});
