import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUnlocks } from '../useUnlocks';

describe('native useUnlocks', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads the initial unlock state (basicBot + classic blue only)', async () => {
    const { result } = renderHook(() => useUnlocks());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getUnlockedItems('bot')).toEqual(['basicBot']);
    expect(result.current.isUnlocked('mechanic', 'zen-mode')).toBe(false);
  });

  it('unlocks zen mode after playing the word "zen" and persists it', async () => {
    const { result } = renderHook(() => useUnlocks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let unlockResults;
    await act(async () => {
      unlockResults = await result.current.checkWordTriggers('zen');
    });

    expect(unlockResults!.length).toBeGreaterThan(0);
    expect(result.current.isUnlocked('mechanic', 'zen-mode')).toBe(true);

    // Persisted - a fresh hook instance reads the same state back.
    const { result: result2 } = renderHook(() => useUnlocks());
    await waitFor(() => expect(result2.current.isLoading).toBe(false));
    expect(result2.current.isUnlocked('mechanic', 'zen-mode')).toBe(true);
  });
});
