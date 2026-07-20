import { useEffect, useRef, useState } from 'react';
import { RemoteGameStateManager, createRemoteGameStateManager } from '../../packages/engine/remoteGamestate';
import { createBrowserAdapter } from '../adapters/browserAdapter';
import { createSupabaseMultiplayerDependencies } from '../adapters/supabaseMultiplayerAdapter';
import { ensureAnonymousSession } from '../adapters/supabaseAuthAdapter';

export interface UseMultiplayerManagerReturn {
  /** The manager instance, once ready. Feed this into `InteractiveGame`'s `externalManager` prop. */
  manager: RemoteGameStateManager | null;
  localPlayerId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Creates and initializes a `RemoteGameStateManager` for a given multiplayer
 * game id, so it can be handed to the *same* `InteractiveGame` board used
 * for vs-bot games (via its `externalManager`/`localPlayerId` props) -
 * multiplayer should look and behave identically, just driven by a
 * different state source.
 */
export function useMultiplayerManager(gameId: string): UseMultiplayerManagerReturn {
  const managerRef = useRef<RemoteGameStateManager | null>(null);
  const [manager, setManager] = useState<RemoteGameStateManager | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const userId = await ensureAnonymousSession();
        if (!userId) {
          if (isMounted) {
            setError('Unable to connect to multiplayer service');
            setIsLoading(false);
          }
          return;
        }

        const browserAdapter = await createBrowserAdapter();
        const wordData = browserAdapter.getWordData();
        if (wordData && typeof wordData.waitForLoad === 'function') {
          await wordData.waitForLoad();
        }

        const remoteDeps = createSupabaseMultiplayerDependencies(userId);
        const dependencies = browserAdapter.getGameDependencies();
        const created = await createRemoteGameStateManager(dependencies, remoteDeps, gameId);

        if (!isMounted) {
          created.dispose();
          return;
        }

        managerRef.current = created;
        setManager(created);
        setLocalPlayerId(userId);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize multiplayer game:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, [gameId]);

  return { manager, localPlayerId, isLoading, error };
}
