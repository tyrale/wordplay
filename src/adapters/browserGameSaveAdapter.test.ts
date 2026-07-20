import { describe, it, expect, beforeEach } from 'vitest';
import { saveActiveGame, loadActiveGame, clearActiveGame } from './browserGameSaveAdapter';
import type { GameState } from '../../packages/engine/interfaces';

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameStatus: 'playing',
    currentWord: 'WORD',
    keyLetters: ['A'],
    lockedLetters: [],
    lockedKeyLetters: [],
    players: [
      { id: 'human', name: 'Player', isBot: false, score: 5, isCurrentPlayer: true },
      { id: 'bot', name: 'Bot AI', isBot: true, score: 3, isCurrentPlayer: false }
    ],
    currentPlayerIndex: 0,
    currentTurn: 2,
    maxTurns: 10,
    usedWords: ['WORD'],
    usedKeyLetters: [],
    turnHistory: [],
    gameStartTime: Date.now(),
    lastMoveTime: Date.now(),
    winner: null,
    totalMoves: 1,
    config: { maxTurns: 10, allowBotPlayer: true, enableKeyLetters: true, enableLockedLetters: true },
    ...overrides
  };
}

describe('browserGameSaveAdapter', () => {
  beforeEach(async () => {
    await clearActiveGame();
  });

  it('returns null when no game has been saved', async () => {
    const result = await loadActiveGame();
    expect(result).toBeNull();
  });

  it('persists and restores an in-progress game', async () => {
    const state = makeGameState();
    await saveActiveGame(state);

    const result = await loadActiveGame();
    expect(result).not.toBeNull();
    expect(result?.state.currentWord).toBe('WORD');
    expect(result?.state.currentTurn).toBe(2);
    expect(result?.state.players[0].score).toBe(5);
  });

  it('overwrites the previous save with the latest state', async () => {
    await saveActiveGame(makeGameState({ currentWord: 'WORD' }));
    await saveActiveGame(makeGameState({ currentWord: 'WORDS', currentTurn: 3 }));

    const result = await loadActiveGame();
    expect(result?.state.currentWord).toBe('WORDS');
    expect(result?.state.currentTurn).toBe(3);
  });

  it('clears the saved game', async () => {
    await saveActiveGame(makeGameState());
    await clearActiveGame();

    const result = await loadActiveGame();
    expect(result).toBeNull();
  });
});
