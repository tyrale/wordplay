import { useState, useEffect, useCallback, useRef } from 'react';
import { createGameStateManagerWithDependencies } from '../../packages/engine/gamestate';
import { createBrowserAdapter } from '../adapters/browserAdapter';
import { loadActiveGame, saveActiveGame, clearActiveGame } from '../adapters/browserGameSaveAdapter';
import type { GameState, MoveAttempt, GameConfig, BotMove, IGameStateManager } from '../../packages/engine/interfaces';

/**
 * Compares only the config fields that determine whether a persisted game
 * is still compatible with the game currently being requested. If these
 * differ, a saved game is considered stale and should not be restored.
 */
function isSavedGameCompatible(savedConfig: GameConfig, requestedConfig?: GameConfig): boolean {
  const a = savedConfig || {};
  const b = requestedConfig || {};
  return (
    a.botId === b.botId &&
    (a.maxTurns ?? 10) === (b.maxTurns ?? 10) &&
    (a.allowBotPlayer ?? true) === (b.allowBotPlayer ?? true) &&
    (a.enableKeyLetters ?? true) === (b.enableKeyLetters ?? true) &&
    (a.enableLockedLetters ?? true) === (b.enableLockedLetters ?? true) &&
    // Only enforce a starting-word match when the caller explicitly requests one
    // (e.g. the tutorial's forced 'WORD' start) - normal bot games don't specify
    // initialWord, so any in-progress save remains restorable after a refresh.
    (b.initialWord === undefined || a.initialWord === b.initialWord)
  );
}

// Game configuration interface
type PublicGameState = GameState;

const initializeBrowserDictionary = async (): Promise<void> => {
  // Dictionary initialization for browser environment
}

export interface UseGameStateOptions {
  config?: GameConfig;
  onGameStateChange?: (state: PublicGameState) => void;
  onMoveAttempt?: (attempt: MoveAttempt) => void;
  onBotMove?: (move: BotMove | null) => void;
  /**
   * Use an already-constructed manager (e.g. `RemoteGameStateManager` for
   * vs-human multiplayer) instead of creating a local bot-game manager.
   * When provided, local-save-slot persistence and the bot-game config
   * (botId-based recreation) are skipped entirely.
   */
  externalManager?: IGameStateManager;
  /**
   * The player id that should be treated as "the local player" for
   * `isPlayerTurn`/`currentPlayer` comparisons. Defaults to `'human'`
   * (the bot-game convention). Multiplayer callers should pass the
   * actual authenticated player id.
   */
  localPlayerId?: string;
  /**
   * Skip reading from and writing to the shared local "active game" save
   * slot entirely. Used by the tutorial, which is a short scripted flow that
   * must always start fresh at its forced `initialWord` and shouldn't
   * overwrite (or be resumed from) the player's real in-progress bot game.
   */
  skipSavedGamePersistence?: boolean;
}

export interface GameStateActions {
  // Word management
  attemptMove: (newWord: string) => MoveAttempt;
  applyMove: (attempt: MoveAttempt) => boolean;
  setCurrentWord: (word: string) => boolean;
  
  // Game flow
  startGame: () => Promise<void>;
  resetGame: () => void;
  passTurn: () => boolean;
  
  // Bot interactions  
  makeBotMove: () => Promise<BotMove | null>;
  
  // Letter management
  addKeyLetter: (letter: string) => void;
  removeKeyLetter: (letter: string) => void;
  addLockedLetter: (letter: string) => void;
  removeLockedLetter: (letter: string) => void;
}

export interface UseGameStateReturn {
  // Current state
  gameState: PublicGameState;
  actions: GameStateActions;
  
  // Computed state
  currentPlayer: string | null;
  isPlayerTurn: boolean;
  isBotTurn: boolean;
  isGameActive: boolean;
  isGameFinished: boolean;
  
  // Loading states
  isBotThinking: boolean;
  isProcessingMove: boolean;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export function useGameState(options: UseGameStateOptions = {}): UseGameStateReturn {
  const { config, onGameStateChange, onMoveAttempt, onBotMove, externalManager, localPlayerId, skipSavedGamePersistence } = options;
  
  // Initialize game manager using browser adapter (pure dependency injection)
  const gameManagerRef = useRef<IGameStateManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track config changes to force recreation when botId changes
  const configRef = useRef(config);
  const [gameManagerKey, setGameManagerKey] = useState(0);

  // Detect botId changes and force game manager recreation (bot-game mode only)
  useEffect(() => {
    if (externalManager) return;
    // Force recreation if botId changed
    if (config?.botId !== configRef.current?.botId) {
      gameManagerRef.current = null;
      setIsInitialized(false);
      setGameManagerKey(prev => prev + 1); // Force effect re-run
    }
    configRef.current = config;
  }, [config?.botId, externalManager]);
  
  // Initialize browser adapter and create game manager (pure dependency injection).
  // When an externalManager is supplied (e.g. multiplayer's RemoteGameStateManager),
  // use it directly instead - it's already fully initialized by the caller.
  useEffect(() => {
    if (externalManager) {
      gameManagerRef.current = externalManager;
      setIsInitialized(true);
      return;
    }

    let isMounted = true;
    
    async function initializeGameManager() {
      try {
        // Create new adapter instance per component (not singleton)
        const browserAdapter = await createBrowserAdapter();
        
        // CRITICAL: Wait for dictionary to fully load before creating game manager
        const wordData = browserAdapter.getWordData();
        if (wordData && typeof wordData.waitForLoad === 'function') {
          await wordData.waitForLoad();
        }
        
        if (isMounted) {
          const dependencies = browserAdapter.getGameDependencies();
          const manager = createGameStateManagerWithDependencies(dependencies, config);

          // Attempt to restore a previously in-progress game (e.g. after a
          // page refresh). Only restore if it's still playing and the
          // requested config matches, otherwise discard the stale save.
          if (!skipSavedGamePersistence) {
            try {
              const saved = await loadActiveGame();
              if (saved && saved.state.gameStatus === 'playing') {
                if (isSavedGameCompatible(saved.state.config, config)) {
                  manager.loadState(saved.state);
                } else {
                  await clearActiveGame();
                }
              } else if (saved) {
                // Finished/waiting saves are no longer useful to restore
                await clearActiveGame();
              }
            } catch (restoreError) {
              console.warn('Failed to restore saved game:', restoreError);
            }
          }

          gameManagerRef.current = manager;
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize game manager:', error);
      }
    }
    
    if (!gameManagerRef.current) {
      initializeGameManager();
    }
    
    return () => {
      isMounted = false;
    };
  }, [config, gameManagerKey, externalManager]); // Add gameManagerKey as dependency to force re-run
  
  const gameManager = gameManagerRef.current;
  
  // Initialize browser dictionary on first load
  useEffect(() => {
    initializeBrowserDictionary().catch(error => {
      console.error('Failed to initialize dictionary:', error);
    });
  }, []);
  
  // React state - provide default state until initialized  
  const [gameState, setGameState] = useState<PublicGameState>(() => ({
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
  }));
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // React state change handler for external callbacks
  useEffect(() => {
    // Handle state changes for external listeners
  }, [gameState]);
  
  // Use refs to avoid dependency issues
  const onGameStateChangeRef = useRef(onGameStateChange);
  const onMoveAttemptRef = useRef(onMoveAttempt);
  const onBotMoveRef = useRef(onBotMove);
  
  // Update refs when callbacks change
  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
    onMoveAttemptRef.current = onMoveAttempt;
    onBotMoveRef.current = onBotMove;
  });

  // Subscribe to game state changes
  useEffect(() => {
    if (!gameManager || !isInitialized) return;
    
        const unsubscribe = gameManager.subscribe(() => {
      const newState = gameManager.getState();
                  setGameState(newState as unknown as PublicGameState);
      onGameStateChangeRef.current?.(newState as unknown as PublicGameState);

      // Persist the in-progress bot game so a refresh/crash doesn't lose it.
      // Not applicable to an externally-managed (e.g. multiplayer) game, which
      // is already persisted remotely, or when explicitly skipped (tutorial) -
      // both cases must not share the local bot-game save slot.
      if (externalManager || skipSavedGamePersistence) return;
      if (newState.gameStatus === 'finished') {
        clearActiveGame().catch(err => console.warn('Failed to clear saved game:', err));
      } else {
        saveActiveGame(newState).catch(err => console.warn('Failed to save game:', err));
      }
    });
    
    // Initialize state when game manager is ready
    const initialState = gameManager.getState();
        setGameState(initialState as unknown as PublicGameState);
    
    return () => {
            unsubscribe();
    };
  }, [gameManager, isInitialized]);
  
  // Clear errors when state changes
  useEffect(() => {
        setLastError(null);
  }, [gameState.currentTurn, gameState.currentWord]);
  
  // Game actions
  const actions: GameStateActions = {
    attemptMove: useCallback((newWord: string) => {
            if (!gameManager || !isInitialized) {
        return {
          newWord,
          isValid: false,
          validationResult: { isValid: false, reason: 'Game not initialized', word: newWord },
          scoringResult: null,
          canApply: false,
          reason: 'Game not initialized'
        };
      }
      
      try {
        setIsProcessingMove(true);
        const attempt = gameManager.attemptMove(newWord);
                onMoveAttemptRef.current?.(attempt);
        return attempt;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
                setLastError(errorMsg);
        return {
          newWord,
          isValid: false,
          validationResult: { isValid: false, reason: errorMsg, word: newWord },
          scoringResult: null,
          canApply: false,
          reason: errorMsg
        };
      } finally {
                setIsProcessingMove(false);
      }
    }, [gameManager, isInitialized]),
    
    applyMove: useCallback((attempt: MoveAttempt) => {
            if (!gameManager || !isInitialized) return false;
      
      try {
        setIsProcessingMove(true);
        return gameManager.applyMove(attempt);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to apply move';
                setLastError(errorMsg);
        return false;
      } finally {
                setIsProcessingMove(false);
      }
    }, [gameManager, isInitialized]),
    
    setCurrentWord: useCallback((word: string) => {
            if (!gameManager || !isInitialized) return false;
      
      try {
        return gameManager.setWord(word);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to set word';
                setLastError(errorMsg);
        return false;
      }
    }, [gameManager, isInitialized]),
    
    startGame: useCallback(async () => {
            if (!gameManager || !isInitialized) return;
      
      try {
        gameManager.startGame();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to start game';
                setLastError(errorMsg);
      }
    }, [gameManager, isInitialized]),
    
    resetGame: useCallback(() => {
            if (!gameManager || !isInitialized) return;
      
      try {
        gameManager.resetGame();
        setIsBotThinking(false);
        setIsProcessingMove(false);
        setLastError(null);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to reset game';
                setLastError(errorMsg);
      }
    }, [gameManager, isInitialized]),
    
    passTurn: useCallback(() => {
            if (!gameManager || !isInitialized) return false;
      
      try {
        return gameManager.passTurn();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to pass turn';
                setLastError(errorMsg);
        return false;
      }
    }, [gameManager, isInitialized]),
    
    makeBotMove: useCallback(async () => {
            if (!gameManager || !isInitialized) {
                return null;
      }

      try {
        setIsBotThinking(true);
        const botMove = await gameManager.makeBotMove();
                onBotMoveRef.current?.(botMove);
        return botMove;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Bot move failed';
                setLastError(errorMsg);
        return null;
      } finally {
        setIsBotThinking(false);
      }
    }, [gameManager, isInitialized]),
    
    addKeyLetter: useCallback((letter: string) => {
            if (!gameManager || !isInitialized) return;
      
      try {
        gameManager.addKeyLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to add key letter';
                setLastError(errorMsg);
      }
    }, [gameManager, isInitialized]),
    
    removeKeyLetter: useCallback((letter: string) => {
            if (!gameManager || !isInitialized) return;
      
      try {
        gameManager.removeKeyLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to remove key letter';
                setLastError(errorMsg);
      }
    }, [gameManager, isInitialized]),
    
    addLockedLetter: useCallback((letter: string) => {
            if (!gameManager || !isInitialized) return;
      
      try {
        gameManager.addLockedLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to add locked letter';
                setLastError(errorMsg);
      }
    }, [gameManager, isInitialized]),
    
    removeLockedLetter: useCallback((letter: string) => {
            if (!gameManager || !isInitialized) return;
      
      try {
        gameManager.removeLockedLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to remove locked letter';
                setLastError(errorMsg);
      }
    }, [gameManager, isInitialized])
  };
  
  // Computed state
  const currentPlayer = gameState.players.find(p => p.isCurrentPlayer)?.id || null;
  const isPlayerTurn = currentPlayer === (localPlayerId ?? 'human');
  const isBotTurn = currentPlayer === 'bot';
  const isGameActive = gameState.gameStatus === 'playing';
  const isGameFinished = gameState.gameStatus === 'finished';
  
  const clearError = useCallback(() => {
        setLastError(null);
  }, []);
  
  return {
    gameState,
    actions,
    currentPlayer,
    isPlayerTurn,
    isBotTurn,
    isGameActive,
    isGameFinished,
    isBotThinking,
    isProcessingMove,
    lastError,
    clearError
  };
}

// Helper hooks for specific game aspects
export function useGameStats(gameState: PublicGameState) {
  return {
    humanScore: gameState.players.find(p => p.id === 'human')?.score || 0,
    botScore: gameState.players.find(p => p.id === 'bot')?.score || 0,
    turnsRemaining: gameState.maxTurns - gameState.currentTurn + 1,
    moveCount: gameState.totalMoves,
    currentTurn: gameState.currentTurn,
    maxTurns: gameState.maxTurns
  };
}

export function useWordState(gameState: PublicGameState) {
  return {
    currentWord: gameState.currentWord,
    wordHistory: gameState.turnHistory.map(turn => turn.newWord),
    keyLetters: gameState.keyLetters || [],
    lockedLetters: gameState.lockedLetters || [],
    lockedKeyLetters: gameState.lockedKeyLetters || [],
    usedWords: Array.from(gameState.usedWords || [])
  };
} 