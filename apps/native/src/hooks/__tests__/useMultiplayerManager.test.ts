import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useMultiplayerManager } from '../useMultiplayerManager';
import { ensureAnonymousSession } from '../../adapters/nativeAuthAdapter';
import { createNativeAdapter } from '../../adapters/nativeAdapter';
import { createNativeMultiplayerDependencies } from '../../adapters/nativeMultiplayerAdapter';
import { createRemoteGameStateManager } from '@wordplay/engine/remoteGamestate';

function getRegisteredAppStateListener(): (state: string) => void {
  const call = (AppState.addEventListener as jest.Mock).mock.calls.find(([event]) => event === 'change');
  return call?.[1];
}

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
    (AppState as unknown as { currentState: string }).currentState = 'active';
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

  it('reconnects the manager when the app returns to the foreground after being backgrounded', async () => {
    (ensureAnonymousSession as jest.Mock).mockResolvedValue('user-1');
    (createNativeAdapter as jest.Mock).mockResolvedValue({
      getWordData: () => ({ waitForLoad: jest.fn().mockResolvedValue(undefined) }),
      getGameDependencies: () => ({})
    });
    const fakeManager = { dispose: jest.fn(), reconnect: jest.fn().mockResolvedValue(undefined) };
    (createRemoteGameStateManager as jest.Mock).mockResolvedValue(fakeManager);

    (AppState as unknown as { currentState: string }).currentState = 'background';
    const { result } = renderHook(() => useMultiplayerManager('game-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    getRegisteredAppStateListener()('active');

    expect(fakeManager.reconnect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect on a redundant active report (no actual background/foreground transition)', async () => {
    (ensureAnonymousSession as jest.Mock).mockResolvedValue('user-1');
    (createNativeAdapter as jest.Mock).mockResolvedValue({
      getWordData: () => ({ waitForLoad: jest.fn().mockResolvedValue(undefined) }),
      getGameDependencies: () => ({})
    });
    const fakeManager = { dispose: jest.fn(), reconnect: jest.fn().mockResolvedValue(undefined) };
    (createRemoteGameStateManager as jest.Mock).mockResolvedValue(fakeManager);

    const { result } = renderHook(() => useMultiplayerManager('game-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    getRegisteredAppStateListener()('active');

    expect(fakeManager.reconnect).not.toHaveBeenCalled();
  });
});
