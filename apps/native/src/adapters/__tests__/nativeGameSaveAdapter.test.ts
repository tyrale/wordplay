import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadActiveGame, saveActiveGame, clearActiveGame } from '../nativeGameSaveAdapter';
import type { GameState } from '@wordplay/engine/interfaces';

function buildTestGameState(): GameState {
  return {
    gameStatus: 'playing',
    currentWord: 'CAT',
    players: [],
    currentPlayerIndex: 0,
    currentTurn: 1,
    maxTurns: 10,
    usedWords: ['CAT'],
    usedKeyLetters: [],
    keyLetters: [],
    lockedLetters: [],
    lockedKeyLetters: [],
    winner: null
  } as unknown as GameState;
}

describe('nativeGameSaveAdapter', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing has been saved', async () => {
    expect(await loadActiveGame()).toBeNull();
  });

  it('round-trips a saved game through AsyncStorage', async () => {
    const state = buildTestGameState();
    await saveActiveGame(state);

    const loaded = await loadActiveGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.currentWord).toBe('CAT');
    expect(typeof loaded!.savedAt).toBe('number');
  });

  it('clears the saved game', async () => {
    await saveActiveGame(buildTestGameState());
    expect(await loadActiveGame()).not.toBeNull();

    await clearActiveGame();
    expect(await loadActiveGame()).toBeNull();
  });
});
