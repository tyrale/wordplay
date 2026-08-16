import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChallengeLeaderboard, readLocalChallengeResult, getTodayChallengeDate } from '../useChallengeLeaderboard';

describe('native useChallengeLeaderboard', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('readLocalChallengeResult returns null when no state has been persisted yet', async () => {
    expect(await readLocalChallengeResult('2020-01-01')).toBeNull();
  });

  it('readLocalChallengeResult reads a real persisted challenge state', async () => {
    const date = getTodayChallengeDate();
    await AsyncStorage.setItem(
      `wordplay-challenge-${date}`,
      JSON.stringify({ date, startWord: 'CAT', targetWord: 'DOG', completed: true, stepCount: 4 })
    );

    const result = await readLocalChallengeResult(date);
    expect(result).toEqual({ date, startWord: 'CAT', targetWord: 'DOG', completed: true, stepCount: 4 });
  });

  it('the hook resolves an empty leaderboard with no local result when Supabase is unconfigured and no state exists', async () => {
    const { result } = renderHook(() => useChallengeLeaderboard(getTodayChallengeDate()));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(result.current.localResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does nothing while challengeDate is null', async () => {
    const { result } = renderHook(() => useChallengeLeaderboard(null));
    await waitFor(() => {});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entries).toEqual([]);
  });
});
