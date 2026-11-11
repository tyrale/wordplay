/**
 * Native useGameState hook.
 *
 * This is apps/web's `hooks/useGameState.ts` ported as directly as
 * possible: the hook body itself has no DOM/browser dependency (it's pure
 * React state + calls into the dependency-injected engine), so only the
 * imports change - native adapter instead of browser adapter, native
 * AsyncStorage-backed game-save adapter instead of the IndexedDB one, and
 * native haptics/sound. Keep this in sync with the web version if its
 * logic changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createGameStateManagerWithDependencies } from '@wordplay/engine/gamestate';
import { createNativeAdapter } from '../adapters/nativeAdapter';
import { loadActiveGame, saveActiveGame, clearActiveGame } from '../adapters/nativeGameSaveAdapter';
import { triggerHapticFeedback } from '../utils/haptics';
import { triggerSoundFeedback } from '../utils/sound';
import type { GameState, MoveAttempt, GameConfig, BotMove, IGameStateManager } from '@wordplay/engine/interfaces';

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
    (b.initialWord === undefined || a.initialWord === b.initialWord)
  );
}

type PublicGameState = GameState;

export interface UseGameStateOptions {
  config?: GameConfig;
  onGameStateChange?: (state: PublicGameState) => void;
  onMoveAttempt?: (attempt: MoveAttempt) => void;
  onBotMove?: (move: BotMove | null) => void;
  externalManager?: IGameStateManager;
  localPlayerId?: string;
  skipSavedGamePersistence?: boolean;
}

export interface GameStateActions {
  attemptMove: (newWord: string) => MoveAttempt;
  applyMove: (attempt: MoveAttempt) => boolean;
  setCurrentWord: (word: string) => boolean;
  startGame: () => Promise<void>;
  resetGame: () => void;
  passTurn: () => boolean;
  makeBotMove: () => Promise<BotMove | null>;
  addKeyLetter: (letter: string) => void;
  removeKeyLetter: (letter: string) => void;
  addLockedLetter: (letter: string) => void;
  removeLockedLetter: (letter: string) => void;
}

export interface UseGameStateReturn {
  gameState: PublicGameState;
  actions: GameStateActions;
  currentPlayer: string | null;
  isPlayerTurn: boolean;
  isBotTurn: boolean;
  isGameActive: boolean;
  isGameFinished: boolean;
  isBotThinking: boolean;
  isProcessingMove: boolean;
  lastError: string | null;
  clearError: () => void;
}

export function useGameState(options: UseGameStateOptions = {}): UseGameStateReturn {
  const { config, onGameStateChange, onMoveAttempt, onBotMove, externalManager, localPlayerId, skipSavedGamePersistence } = options;

  const gameManagerRef = useRef<IGameStateManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const configRef = useRef(config);
  const [gameManagerKey, setGameManagerKey] = useState(0);

  useEffect(() => {
    if (externalManager) return;
    if (config?.botId !== configRef.current?.botId) {
      gameManagerRef.current = null;
      setIsInitialized(false);
      setGameManagerKey(prev => prev + 1);
    }
    configRef.current = config;
  }, [config?.botId, externalManager]);

  useEffect(() => {
    if (externalManager) {
      gameManagerRef.current = externalManager;
      setIsInitialized(true);
      return;
    }

    let isMounted = true;

    async function initializeGameManager() {
      try {
        const nativeAdapter = await createNativeAdapter();

        const wordData = nativeAdapter.getWordData();
        if (wordData && typeof wordData.waitForLoad === 'function') {
          await wordData.waitForLoad();
        }

        if (isMounted) {
          const dependencies = nativeAdapter.getGameDependencies();
          const manager = createGameStateManagerWithDependencies(dependencies, config);

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
  }, [config, gameManagerKey, externalManager]);

  const gameManager = gameManagerRef.current;

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

  const onGameStateChangeRef = useRef(onGameStateChange);
  const onMoveAttemptRef = useRef(onMoveAttempt);
  const onBotMoveRef = useRef(onBotMove);

  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
    onMoveAttemptRef.current = onMoveAttempt;
    onBotMoveRef.current = onBotMove;
  });

  useEffect(() => {
    if (!gameManager || !isInitialized) return;

    const unsubscribe = gameManager.subscribe(() => {
      const newState = gameManager.getState();
      setGameState(newState as unknown as PublicGameState);
      onGameStateChangeRef.current?.(newState as unknown as PublicGameState);

      if (externalManager || skipSavedGamePersistence) return;
      if (newState.gameStatus === 'finished') {
        clearActiveGame().catch(err => console.warn('Failed to clear saved game:', err));
      } else {
        saveActiveGame(newState).catch(err => console.warn('Failed to save game:', err));
      }
    });

    const initialState = gameManager.getState();
    setGameState(initialState as unknown as PublicGameState);

    return () => {
      unsubscribe();
    };
  }, [gameManager, isInitialized]);

  useEffect(() => {
    setLastError(null);
  }, [gameState.currentTurn, gameState.currentWord]);

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
        const passed = gameManager.passTurn();
        if (passed) {
          triggerHapticFeedback('pass');
          triggerSoundFeedback('pass');
        }
        return passed;
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

  const currentPlayer = gameState.players.find(p => p.isCurrentPlayer)?.id || null;
  const isPlayerTurn = currentPlayer === (localPlayerId ?? 'human');
  const isBotTurn = currentPlayer === 'bot';
  const isGameActive = gameState.gameStatus === 'playing';
  const isGameFinished = gameState.gameStatus === 'finished';

  const wasPlayerTurnRef = useRef(isPlayerTurn);
  const hasSeenActiveGameRef = useRef(false);
  useEffect(() => {
    if (isGameActive) {
      if (hasSeenActiveGameRef.current && isPlayerTurn && !wasPlayerTurnRef.current) {
        triggerHapticFeedback('yourTurn');
        triggerSoundFeedback('yourTurn');
      }
      hasSeenActiveGameRef.current = true;
    } else {
      hasSeenActiveGameRef.current = false;
    }
    wasPlayerTurnRef.current = isPlayerTurn;
  }, [isPlayerTurn, isGameActive]);

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

export function useGameStats(gameState: PublicGameState) {
  const currentRound = Math.ceil(gameState.currentTurn / gameState.players.length);
  return {
    humanScore: gameState.players.find(p => p.id === 'human')?.score || 0,
    botScore: gameState.players.find(p => p.id === 'bot')?.score || 0,
    turnsRemaining: gameState.maxTurns - currentRound + 1,
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
