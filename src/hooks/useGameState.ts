import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LocalGameStateManagerWithDependencies, 
  createGameStateManagerWithDependencies,
  type GameStateDependencies
} from '../../packages/engine/gamestate';
import { BrowserAdapter } from '../adapters/browserAdapter';

// Temporary placeholder types until dependency injection implemented - TODO: Replace in Step 3
interface PublicGameState {
  gameStatus: string;
  currentTurn: number;
  currentWord: string;
  players: any[];
  winner?: any;
  turnHistory: any[];
  keyLetters: string[];
  lockedLetters: string[];
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
  [key: string]: any;
}

interface BotMove {
  word: string;
  score: number;
  confidence: number;
  reasoning: string[];
}

const initializeBrowserDictionary = async (): Promise<void> => {
  // TODO: Replace with dependency injection in Step 3
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
  
  // Initialize game manager using browser adapter (Step 4 completion)
  const gameManagerRef = useRef<LocalGameStateManagerWithDependencies | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize browser adapter and create game manager
  useEffect(() => {
    let isMounted = true;
    
    async function initializeGameManager() {
      try {
        const browserAdapter = BrowserAdapter.getInstance();
        await browserAdapter.initialize();
        
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
  }, [config]);
  
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
    usedWords: []
  }));
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Subscribe to game state changes
  useEffect(() => {
    if (!gameManager || !isInitialized) return;
    
    const unsubscribe = gameManager.subscribe(() => {
      const newState = gameManager.getState();
      setGameState(newState);
      onGameStateChange?.(newState);
    });
    
    // Initialize state when game manager is ready
    setGameState(gameManager.getState());
    
    return unsubscribe;
  }, [gameManager, onGameStateChange, isInitialized]);
  
  // Clear errors when state changes
  useEffect(() => {
    setLastError(null);
  }, [gameState.currentTurn, gameState.currentWord]);
  
  // Game actions
  const actions: GameStateActions = {
    attemptMove: useCallback((newWord: string) => {
      try {
        setIsProcessingMove(true);
        const attempt = gameManager.attemptMove(newWord);
        onMoveAttempt?.(attempt);
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
    }, [gameManager, onMoveAttempt]),
    
    applyMove: useCallback((attempt: MoveAttempt) => {
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
    }, [gameManager]),
    
    setCurrentWord: useCallback((word: string) => {
      try {
        return gameManager.setWord(word);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to set word';
        setLastError(errorMsg);
        return false;
      }
    }, [gameManager]),
    
    startGame: useCallback(async () => {
      try {
        await gameManager.startGame();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to start game';
        setLastError(errorMsg);
      }
    }, [gameManager]),
    
    resetGame: useCallback(() => {
      try {
        gameManager.resetGame();
        setIsBotThinking(false);
        setIsProcessingMove(false);
        setLastError(null);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to reset game';
        setLastError(errorMsg);
      }
    }, [gameManager]),
    
    passTurn: useCallback(() => {
      try {
        return gameManager.passTurn();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to pass turn';
        setLastError(errorMsg);
        return false;
      }
    }, [gameManager]),
    
    makeBotMove: useCallback(async () => {
      try {
        setIsBotThinking(true);
        const botMove = await gameManager.makeBotMove();
        onBotMove?.(botMove);
        return botMove;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Bot move failed';
        setLastError(errorMsg);
        return null;
      } finally {
        setIsBotThinking(false);
      }
    }, [gameManager, onBotMove]),
    
    addKeyLetter: useCallback((letter: string) => {
      try {
        gameManager.addKeyLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to add key letter';
        setLastError(errorMsg);
      }
    }, [gameManager]),
    
    removeKeyLetter: useCallback((letter: string) => {
      try {
        gameManager.removeKeyLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to remove key letter';
        setLastError(errorMsg);
      }
    }, [gameManager]),
    
    addLockedLetter: useCallback((letter: string) => {
      try {
        gameManager.addLockedLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to add locked letter';
        setLastError(errorMsg);
      }
    }, [gameManager]),
    
    removeLockedLetter: useCallback((letter: string) => {
      try {
        gameManager.removeLockedLetter(letter);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to remove locked letter';
        setLastError(errorMsg);
      }
    }, [gameManager])
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
    keyLetters: gameState.keyLetters,
    lockedLetters: gameState.lockedLetters,
    lockedKeyLetters: gameState.lockedKeyLetters,
    usedWords: Array.from(gameState.usedWords || [])
  };
} 