import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChallenge } from '../useChallenge';

describe('native useChallenge', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('initializes and starts a fresh daily challenge with a real start/target word pair', async () => {
    const { result } = renderHook(() => useChallenge());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.startChallenge();
    });

    expect(result.current.challengeState).not.toBeNull();
    expect(result.current.challengeState!.startWord.length).toBeGreaterThan(0);
    expect(result.current.challengeState!.targetWord.length).toBeGreaterThan(0);
    expect(result.current.challengeState!.currentWord).toBe(result.current.challengeState!.startWord);
    expect(result.current.challengeState!.completed).toBe(false);
    expect(result.current.challengeState!.failed).toBe(false);
  });

  it('the same date always produces the same challenge (deterministic, persisted across a remount)', async () => {
    const { result } = renderHook(() => useChallenge());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    await act(async () => {
      await result.current.startChallenge();
    });
    const first = result.current.challengeState;

    const { result: result2 } = renderHook(() => useChallenge());
    await waitFor(() => expect(result2.current.isInitialized).toBe(true));
    await act(async () => {
      await result2.current.startChallenge();
    });

    expect(result2.current.challengeState?.startWord).toBe(first?.startWord);
    expect(result2.current.challengeState?.targetWord).toBe(first?.targetWord);
    expect(result2.current.challengeState?.date).toBe(first?.date);
  });

  it('forfeitChallenge marks the challenge as failed', async () => {
    const { result } = renderHook(() => useChallenge());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    await act(async () => {
      await result.current.startChallenge();
    });

    await act(async () => {
      await result.current.forfeitChallenge();
    });

    expect(result.current.challengeState?.failed).toBe(true);
  });
});
