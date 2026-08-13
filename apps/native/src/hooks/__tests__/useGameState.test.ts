import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameState } from '../useGameState';

describe('native useGameState', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('initializes with a fresh (not-yet-started) game with a non-empty starting word, then becomes active once startGame() is called', async () => {
    const { result } = renderHook(() => useGameState({ config: { maxTurns: 5, allowBotPlayer: true } }));

    await waitFor(() => {
      expect(result.current.gameState.currentWord.length).toBeGreaterThan(0);
    });
    expect(result.current.isGameActive).toBe(false);

    await act(async () => {
      await result.current.actions.startGame();
    });

    await waitFor(() => expect(result.current.isGameActive).toBe(true));
    expect(result.current.isPlayerTurn).toBe(true);
  });

  it('applies a valid move and updates the current word/score', async () => {
    const { result } = renderHook(() => useGameState({ config: { maxTurns: 5, allowBotPlayer: true, initialWord: 'CAT' } }));

    await waitFor(() => {
      expect(result.current.gameState.currentWord).toBe('CAT');
    });
    await act(async () => {
      await result.current.actions.startGame();
    });

    let attempt;
    act(() => {
      attempt = result.current.actions.attemptMove('CATS');
    });
    expect(attempt!.isValid).toBe(true);

    act(() => {
      result.current.actions.applyMove(attempt!);
    });

    await waitFor(() => {
      expect(result.current.gameState.currentWord).toBe('CATS');
    });
    expect(result.current.gameState.usedWords).toContain('CATS');
  });

  it('persists the in-progress game to AsyncStorage and restores it on next mount', async () => {
    const { result, unmount } = renderHook(() =>
      useGameState({ config: { maxTurns: 5, allowBotPlayer: true, initialWord: 'CAT' } })
    );

    await waitFor(() => expect(result.current.gameState.currentWord).toBe('CAT'));
    await act(async () => {
      await result.current.actions.startGame();
    });

    let attempt;
    act(() => {
      attempt = result.current.actions.attemptMove('CATS');
      result.current.actions.applyMove(attempt!);
    });
    await waitFor(() => expect(result.current.gameState.currentWord).toBe('CATS'));

    // Give the fire-and-forget saveActiveGame() call a tick to complete.
    await waitFor(async () => {
      const saved = await AsyncStorage.getItem('wordplay-active-game-state');
      expect(saved).not.toBeNull();
    });

    unmount();

    const { result: result2 } = renderHook(() =>
      useGameState({ config: { maxTurns: 5, allowBotPlayer: true, initialWord: 'CAT' } })
    );

    await waitFor(() => expect(result2.current.gameState.currentWord).toBe('CATS'));
  });

  it('passTurn advances the turn without requiring a word change', async () => {
    const { result } = renderHook(() => useGameState({ config: { maxTurns: 5, allowBotPlayer: true, initialWord: 'CAT' } }));
    await waitFor(() => expect(result.current.gameState.currentWord).toBe('CAT'));
    await act(async () => {
      await result.current.actions.startGame();
    });

    const turnBefore = result.current.gameState.currentTurn;
    act(() => {
      result.current.actions.passTurn();
    });

    await waitFor(() => expect(result.current.gameState.currentTurn).toBeGreaterThan(turnBefore));
  });
});
