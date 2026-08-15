import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStats } from '../usePlayerStats';

describe('native usePlayerStats', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads a fresh, all-zero stats log initially', async () => {
    const { result } = renderHook(() => usePlayerStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats.gamesPlayed).toBe(0);
    expect(result.current.stats.totalWordsPlayed).toBe(0);
  });

  it('recordGameResult updates and persists stats across a remount', async () => {
    const { result } = renderHook(() => usePlayerStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordGameResult({
        playerId: 'human',
        botId: 'basicBot',
        won: true,
        tied: false,
        turnHistory: [],
        totalTurns: 4,
        finalScore: 42,
        gameDurationMs: 60000,
        timestamp: Date.now()
      });
    });

    expect(result.current.stats.gamesPlayed).toBe(1);
    expect(result.current.stats.gamesWon).toBe(1);
    expect(result.current.stats.totalScore).toBe(42);

    const { result: result2 } = renderHook(() => usePlayerStats());
    await waitFor(() => expect(result2.current.isLoading).toBe(false));
    expect(result2.current.stats.gamesPlayed).toBe(1);
    expect(result2.current.stats.gamesWon).toBe(1);
  });

  it('recordMove accumulates word stats', async () => {
    const { result } = renderHook(() => usePlayerStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordMove({
        turnNumber: 1,
        playerId: 'human',
        previousWord: 'CAT',
        newWord: 'CATS',
        score: 5,
        keyLettersUsed: [],
        scoringBreakdown: {
          score: 5,
          totalScore: 5,
          breakdown: { addLetterPoints: 5, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 0 },
          actions: [{ type: 'add', letters: ['S'], score: 5 }],
          keyLetterScore: 0,
          baseScore: 5,
          keyLettersUsed: []
        },
        timestamp: Date.now()
      });
    });

    expect(result.current.stats.totalWordsPlayed).toBe(1);
    expect(result.current.stats.longestWordPlayed).toBe('CATS');
  });

  it('resetStats clears the log back to zero', async () => {
    const { result } = renderHook(() => usePlayerStats());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordGameResult({
        playerId: 'human',
        won: true,
        tied: false,
        turnHistory: [],
        totalTurns: 1,
        finalScore: 10,
        gameDurationMs: null,
        timestamp: Date.now()
      });
    });
    expect(result.current.stats.gamesPlayed).toBe(1);

    await act(async () => {
      await result.current.resetStats();
    });
    expect(result.current.stats.gamesPlayed).toBe(0);
  });
});
