import { renderHook, waitFor } from '@testing-library/react-native';
import { useMultiplayerManager } from '../useMultiplayerManager';
import { ensureAnonymousSession } from '../../adapters/nativeAuthAdapter';
import { createNativeAdapter } from '../../adapters/nativeAdapter';
import { createNativeMultiplayerDependencies } from '../../adapters/nativeMultiplayerAdapter';
import { createRemoteGameStateManager } from '@wordplay/engine/remoteGamestate';

jest.mock('../../adapters/nativeAuthAdapter', () => ({
  ensureAnonymousSession: jest.fn()
}));

jest.mock('../../adapters/nativeAdapter', () => ({
  createNativeAdapter: jest.fn()
}));

jest.mock('../../adapters/nativeMultiplayerAdapter', () => ({
  createNativeMultiplayerDependencies: jest.fn().mockReturnValue({ getLocalPlayerId: () => 'user-1' })
}));

jest.mock('@wordplay/engine/remoteGamestate', () => ({
  createRemoteGameStateManager: jest.fn()
}));

describe('native useMultiplayerManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports an error without ever creating a manager if authentication fails', async () => {
    (ensureAnonymousSession as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useMultiplayerManager('game-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Unable to connect to multiplayer service');
    expect(result.current.manager).toBeNull();
    expect(createRemoteGameStateManager).not.toHaveBeenCalled();
  });

  it('initializes a manager and reports the authenticated user id once dictionary data is ready', async () => {
    (ensureAnonymousSession as jest.Mock).mockResolvedValue('user-1');
    const waitForLoad = jest.fn().mockResolvedValue(undefined);
    (createNativeAdapter as jest.Mock).mockResolvedValue({
      getWordData: () => ({ waitForLoad }),
      getGameDependencies: () => ({ some: 'deps' })
    });
    const fakeManager = { dispose: jest.fn() };
    (createRemoteGameStateManager as jest.Mock).mockResolvedValue(fakeManager);

    const { result } = renderHook(() => useMultiplayerManager('game-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.manager).toBe(fakeManager);
    expect(result.current.localPlayerId).toBe('user-1');
    expect(result.current.error).toBeNull();
    expect(waitForLoad).toHaveBeenCalled();
    expect(createNativeMultiplayerDependencies).toHaveBeenCalledWith('user-1');
    expect(createRemoteGameStateManager).toHaveBeenCalledWith({ some: 'deps' }, expect.any(Object), 'game-1');
  });

  it('reports an error message if manager creation throws', async () => {
    (ensureAnonymousSession as jest.Mock).mockResolvedValue('user-1');
    (createNativeAdapter as jest.Mock).mockRejectedValue(new Error('adapter init failed'));

    const { result } = renderHook(() => useMultiplayerManager('game-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('adapter init failed');
    expect(result.current.manager).toBeNull();
  });

  it('disposes the manager on unmount', async () => {
    (ensureAnonymousSession as jest.Mock).mockResolvedValue('user-1');
    (createNativeAdapter as jest.Mock).mockResolvedValue({
      getWordData: () => ({ waitForLoad: jest.fn().mockResolvedValue(undefined) }),
      getGameDependencies: () => ({})
    });
    const fakeManager = { dispose: jest.fn() };
    (createRemoteGameStateManager as jest.Mock).mockResolvedValue(fakeManager);

    const { result, unmount } = renderHook(() => useMultiplayerManager('game-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();
    expect(fakeManager.dispose).toHaveBeenCalledTimes(1);
  });
});
