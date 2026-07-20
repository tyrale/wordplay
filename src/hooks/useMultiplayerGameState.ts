import { useState, useEffect, useCallback, useRef } from 'react';
import { RemoteGameStateManager, createRemoteGameStateManager } from '../../packages/engine/remoteGamestate';
import { createBrowserAdapter } from '../adapters/browserAdapter';
import { createSupabaseMultiplayerDependencies } from '../adapters/supabaseMultiplayerAdapter';
import { ensureAnonymousSession } from '../adapters/supabaseAuthAdapter';
import type { GameState, MoveAttempt } from '../../packages/engine/interfaces';

export interface UseMultiplayerGameStateOptions {
  gameId: string;
  onGameStateChange?: (state: GameState) => void;
}

export interface MultiplayerGameStateActions {
  attemptMove: (newWord: string) => MoveAttempt;
  applyMove: (attempt: MoveAttempt) => boolean;
  passTurn: () => boolean;
  resign: () => Promise<void>;
}

export interface UseMultiplayerGameStateReturn {
  gameState: GameState;
  actions: MultiplayerGameStateActions;
  localPlayerId: string | null;
  isLocalPlayerTurn: boolean;
  isGameActive: boolean;
  isGameFinished: boolean;
  isProcessingMove: boolean;
  isLoading: boolean;
  lastError: string | null;
  clearError: () => void;
}

const EMPTY_STATE: GameState = {
  gameStatus: 'waiting',
  currentTurn: 0,
  currentWord: '',
  players: [],
  turnHistory: [],
  keyLetters: [],
  lockedLetters: [],
  lockedKeyLetters: [],
  usedWords: [],
  currentPlayerIndex: 0,
  maxTurns: 0,
  usedKeyLetters: [],
  gameStartTime: null,
  lastMoveTime: null,
  winner: null,
  totalMoves: 0,
  config: {}
};

/**
 * Async "vs human" multiplayer counterpart to `useGameState`. Backed by
 * `RemoteGameStateManager` + the Supabase multiplayer adapter instead of a
 * local bot. See `docs/features/MULTIPLAYER_VS_HUMAN_PLAN.md`.
 */
export function useMultiplayerGameState(options: UseMultiplayerGameStateOptions): UseMultiplayerGameStateReturn {
  const { gameId, onGameStateChange } = options;

  const managerRef = useRef<RemoteGameStateManager | null>(null);
  const onGameStateChangeRef = useRef(onGameStateChange);
  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
  });

  const [gameState, setGameState] = useState<GameState>(EMPTY_STATE);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        const userId = await ensureAnonymousSession();
        if (!userId) {
          if (isMounted) setLastError('Unable to connect to multiplayer service');
          return;
        }

        const browserAdapter = await createBrowserAdapter();
        const wordData = browserAdapter.getWordData();
        if (wordData && typeof wordData.waitForLoad === 'function') {
          await wordData.waitForLoad();
        }

        const remoteDeps = createSupabaseMultiplayerDependencies(userId);
        const dependencies = browserAdapter.getGameDependencies();
        const manager = await createRemoteGameStateManager(dependencies, remoteDeps, gameId);

        if (!isMounted) {
          manager.dispose();
          return;
        }

        managerRef.current = manager;
        setLocalPlayerId(userId);

        unsubscribe = manager.subscribe(() => {
          const newState = manager.getState();
          setGameState(newState);
          onGameStateChangeRef.current?.(newState);
        });

        const initialState = manager.getState();
        setGameState(initialState);

        // Multiplayer games are created already-'active'; ensure local
        // status reflects 'playing' so the UI renders the board.
        if (initialState.gameStatus === 'waiting') {
          manager.startGame();
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize multiplayer game:', error);
        if (isMounted) {
          setLastError(error instanceof Error ? error.message : 'Failed to load game');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, [gameId]);

  const attemptMove = useCallback((newWord: string): MoveAttempt => {
    const manager = managerRef.current;
    if (!manager) {
      return {
        newWord,
        isValid: false,
        validationResult: { isValid: false, reason: 'Game not initialized', word: newWord },
        scoringResult: null,
        canApply: false,
        reason: 'Game not initialized'
      };
    }
    return manager.attemptMove(newWord);
  }, []);

  const applyMove = useCallback((attempt: MoveAttempt): boolean => {
    const manager = managerRef.current;
    if (!manager) return false;
    try {
      setIsProcessingMove(true);
      return manager.applyMove(attempt);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to apply move');
      return false;
    } finally {
      setIsProcessingMove(false);
    }
  }, []);

  const passTurn = useCallback((): boolean => {
    const manager = managerRef.current;
    if (!manager) return false;
    return manager.passTurn();
  }, []);

  const resign = useCallback(async (): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;
    await manager.resign();
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  const isLocalPlayerTurn = !!localPlayerId && gameState.players.find(p => p.isCurrentPlayer)?.id === localPlayerId;

  return {
    gameState,
    actions: { attemptMove, applyMove, passTurn, resign },
    localPlayerId,
    isLocalPlayerTurn,
    isGameActive: gameState.gameStatus === 'playing',
    isGameFinished: gameState.gameStatus === 'finished',
    isProcessingMove,
    isLoading,
    lastError,
    clearError
  };
}
