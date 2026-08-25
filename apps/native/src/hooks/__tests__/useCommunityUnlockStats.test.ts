import { renderHook, waitFor } from '@testing-library/react-native';
import { useCommunityUnlockStats } from '../useCommunityUnlockStats';
import { fetchCommunityUnlockStats } from '../../adapters/nativeCommunityUnlocksAdapter';
import { UNLOCK_DEFINITIONS } from '@wordplay/engine/unlock-definitions';

jest.mock('../../adapters/nativeCommunityUnlocksAdapter', () => ({
  fetchCommunityUnlockStats: jest.fn()
}));

describe('native useCommunityUnlockStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch anything while disabled, defaulting to a zeroed, non-loading progress', () => {
    const { result } = renderHook(() => useCommunityUnlockStats(false));
    expect(fetchCommunityUnlockStats).not.toHaveBeenCalled();
    expect(result.current).toEqual({ unlocked: 0, total: UNLOCK_DEFINITIONS.length, isLoading: false });
  });

  it('fetches and reports how many unlock definitions have a nonzero community count, once enabled', async () => {
    const firstTwoIds = UNLOCK_DEFINITIONS.slice(0, 2).map(def => def.id).filter((id): id is string => !!id);
    (fetchCommunityUnlockStats as jest.Mock).mockResolvedValue({
      counts: Object.fromEntries(firstTwoIds.map(id => [id, 5])),
      totalPlayers: 100
    });

    const { result } = renderHook(() => useCommunityUnlockStats(true));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unlocked).toBe(firstTwoIds.length);
    expect(result.current.total).toBe(UNLOCK_DEFINITIONS.length);
  });

  it('does not count a definition with a zero (or missing) community count as unlocked', async () => {
    (fetchCommunityUnlockStats as jest.Mock).mockResolvedValue({ counts: {}, totalPlayers: 0 });

    const { result } = renderHook(() => useCommunityUnlockStats(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unlocked).toBe(0);
  });

  it('stops loading (without throwing) if the fetch fails', async () => {
    (fetchCommunityUnlockStats as jest.Mock).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useCommunityUnlockStats(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unlocked).toBe(0);
  });
});
