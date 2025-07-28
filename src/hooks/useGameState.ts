import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LocalGameStateManagerWithDependencies, 
  createGameStateManagerWithDependencies,
  type GameStateDependencies
} from '../../packages/engine/gamestate';
import { createBrowserAdapter } from '../adapters/browserAdapter';

// Game configuration interface
interface PublicGameState {
  gameStatus: string;
  currentTurn: number;
  currentWord: string;
  players: any[];
  winner?: any;
  turnHistory: any[];
  keyLetters: string[];
  lockedLetters: string[];
  lockedKeyLetters: string[];
  usedWords: string[];
  [key: string]: any;
}

interface MoveAttempt {
  newWord: string;
  isValid: boolean;
  validationResult: any;
  scoringResult: any;
  canApply: boolean;
  reason?: string;
}

interface GameConfig {
  maxTurns?: number;
  startingWord?: string;
  botId?: string;
  [key: string]: any;
}

interface BotMove {
  word: string;
  score: number;
  confidence: number;
  reasoning: string[];
}

const initializeBrowserDictionary = async (): Promise<void> => {
  // Dictionary initialization for browser environment
}

export interface UseGameStateOptions {
  config?: GameConfig;
  onGameStateChange?: (state: PublicGameState) => void;
  onMoveAttempt?: (attempt: MoveAttempt) => void;
  onBotMove?: (move: BotMove | null) => void;
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
  const { config, onGameStateChange, onMoveAttempt, onBotMove } = options;
  
  // Initialize game manager using browser adapter (pure dependency injection)
  const gameManagerRef = useRef<LocalGameStateManagerWithDependencies | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track config changes to force recreation when botId changes
  const configRef = useRef(config);
  const [gameManagerKey, setGameManagerKey] = useState(0);

  // Detect botId changes and force game manager recreation
  useEffect(() => {
    // Force recreation if botId changed
    if (config?.botId !== configRef.current?.botId) {
      gameManagerRef.current = null;
      setIsInitialized(false);
      setGameManagerKey(prev => prev + 1); // Force effect re-run
    }
    configRef.current = config;
  }, [config?.botId]);
  
  // Initialize browser adapter and create game manager (pure dependency injection)
  useEffect(() => {
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
          gameManagerRef.current = createGameStateManagerWithDependencies(dependencies, config);
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
  }, [config, gameManagerKey]); // Add gameManagerKey as dependency to force re-run
  
  const gameManager = gameManagerRef.current;
  
  // Initialize browser dictionary on first load
  useEffect(() => {
    initializeBrowserDictionary().catch(error => {
      console.error('Failed to initialize dictionary:', error);
    });
  }, []);
  
  // React state - provide default state until initialized  
  const [gameState, setGameState] = useState<PublicGameState>(() => ({
    gameStatus: 'notStarted',
    currentTurn: 0,
    currentWord: '',
    players: [],
    turnHistory: [],
    keyLetters: [],
    lockedLetters: [],
    lockedKeyLetters: [],
    usedWords: []
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
  const isPlayerTurn = currentPlayer === 'human';
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