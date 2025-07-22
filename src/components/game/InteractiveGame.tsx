import React, { useState, useEffect, useCallback } from 'react';
import { useGameState, useGameStats, useWordState } from '../../hooks/useGameState';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import { AlphabetGrid } from './AlphabetGrid';
import { WordTrail } from './WordTrail';

import { ScoreDisplay } from './ScoreDisplay';
import { WordBuilder } from './WordBuilder';
import { DebugDialog } from './DebugDialog';
import { Menu } from '../ui/Menu';
import { createWebAdapter } from '../../adapters/webAdapter';
import { getBotDisplayName } from '../../data/botRegistry';

// Temporary placeholder types until dependency injection implemented - TODO: Replace in Step 3
interface GameConfig {
  maxTurns?: number;
  startingWord?: string;
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

// Initialize web adapter for dictionary validation
let webAdapter: any = null;

const initializeWebAdapter = async () => {
  if (!webAdapter) {
    webAdapter = await createWebAdapter();
  }
  return webAdapter;
};

const isValidDictionaryWord = (word: string): boolean => {
  if (!webAdapter) {
    console.warn('Web adapter not initialized, using fallback validation');
    return false;
  }
  
  const deps = webAdapter.getDictionaryDependencies();
  const result = deps.validateWord(word, { 
    allowSlang: true, 
    checkLength: false 
  });
  return result.isValid;
};

import type { LetterState, ScoreBreakdown, LetterHighlight, WordMove } from '../index';
import type { ActionState } from './ScoreDisplay';
import './InteractiveGame.css';

export interface InteractiveGameProps {
  config?: GameConfig;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
  onResign?: () => void;
  onNavigateHome?: () => void;
  currentGameMode?: string;
  onStartGame?: (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => void;
  onGameStateChange?: (gameState: any) => void;
  disableLetterRemoval?: boolean;
}

export const InteractiveGame: React.FC<InteractiveGameProps> = ({
  config,
  onGameEnd,
  onResign,
  onNavigateHome,
  currentGameMode,
  onStartGame,
  onGameStateChange,
  disableLetterRemoval = false
}) => {
  // Unlock system integration
  const { handleWordSubmission, handleGameCompletion } = useUnlockSystem();
  
  // Game state management
  const {
    gameState,
    actions,
    isPlayerTurn,
    isBotTurn,
    isGameActive,
    isGameFinished,
    isBotThinking,
    isProcessingMove,
    lastError,
    clearError
  } = useGameState({
    config,
    onGameStateChange: async (state) => {
      if (state.gameStatus === 'finished' && onGameEnd) {
        const humanScore = state.players.find(p => p.id === 'human')?.score || 0;
        const botScore = state.players.find(p => p.id === 'bot')?.score || 0;
        
        // Check for unlock triggers on game completion
        await handleGameCompletion(state.winner?.id || null, config?.botId);
        
        onGameEnd(state.winner?.id || null, { human: humanScore, bot: botScore });
      }
    }
  });

  // Derived state
  const gameStats = useGameStats(gameState);
  const wordState = useWordState(gameState);
  
  // Local UI state
  const [pendingWord, setPendingWord] = useState('');
  
  // Track pendingWord changes
  useEffect(() => {
    // Clean, no debug logs
  }, [pendingWord]);
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showValidationError, setShowValidationError] = useState(false);

  // Initialize web adapter for dictionary validation
  useEffect(() => {
    const initializeGameDependencies = async () => {
      try {
        const adapter = await createWebAdapter();
        const dependencies = adapter.getGameDependencies();
        // Use dependencies as needed
      } catch (err) {
        console.error('Failed to initialize game dependencies:', err);
      }
    };

    initializeGameDependencies();
  }, []);



  // Initialize pending word with current word
  useEffect(() => {
    setPendingWord(wordState.currentWord);
  }, [wordState.currentWord]);

  // Notify parent of game state changes (for tutorial)
  useEffect(() => {
    if (onGameStateChange && gameState) {
      onGameStateChange(gameState);
    }
  }, [gameState, onGameStateChange]);

  // Handle game end
  useEffect(() => {
    if (isGameFinished && !showGameEnd) {
      setShowGameEnd(true);
    }
  }, [isGameFinished, showGameEnd]);

  // Auto-trigger bot moves only when it becomes bot's turn
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isBotTurn && isGameActive && !isBotThinking) {
      console.log('[DEBUG] Bot move useEffect: Triggering bot move - isBotTurn:', isBotTurn, 'isGameActive:', isGameActive, 'isBotThinking:', isBotThinking);
      // Add delay for better UX
      timeoutId = setTimeout(async () => {
        console.log('[DEBUG] Bot move useEffect: Timeout fired, calling makeBotMove');
        const botMove = await actions.makeBotMove();
        console.log('[DEBUG] Bot move useEffect: makeBotMove completed with result:', botMove);
        if (botMove) {
          // setBotMoveHistory(prev => [...prev, botMove]);
        }
      }, 1000); // 1 second delay to show bot is "thinking"
    }
    
    return () => {
      if (timeoutId) {
        console.log('[DEBUG] Bot move useEffect: Cleaning up timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [isBotTurn, isGameActive, isBotThinking, actions.makeBotMove]); // Removed gameState.players to prevent retriggering

  // Letter grid state
  const letterStates: LetterState[] = React.useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const states = alphabet.map(letter => {
      // Only current key letters get accent color styling
      if (wordState.keyLetters.includes(letter)) {
        return { letter, state: 'key' as const };
      }
      // Both regular locked letters and locked key letters get lock icon with normal background
      if (wordState.lockedLetters.includes(letter) || wordState.lockedKeyLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      // Normal letters
      return { letter, state: 'normal' as const };
    });
    
    return states;
  }, [wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  // Pending word highlights (for word builder)
  const pendingWordHighlights: LetterHighlight[] = React.useMemo(() => {
    return pendingWord.split('').map((letter, index) => {
      // Locked key letters take priority (they were key letters that became locked)
      if (wordState.lockedKeyLetters.includes(letter)) {
        return { index, type: 'lockedKey' as const };
      }
      if (wordState.keyLetters.includes(letter)) {
        return { index, type: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { index, type: 'locked' as const };
      }
      return null;
    }).filter((highlight): highlight is LetterHighlight => highlight !== null);
  }, [pendingWord, wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  // Action indicators based on pending move
  const actionState: ActionState = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { add: false, remove: false, move: false };
    }
    
    const actions = pendingMoveAttempt.scoringResult.actions;
    
    // Handle both string arrays (legacy) and ScoringAction arrays (new)
    if (Array.isArray(actions) && actions.length > 0) {
      if (typeof actions[0] === 'string') {
        // Legacy string format
        return {
          add: actions.some((action: any) => action.startsWith('Added letter')),
          remove: actions.some((action: any) => action.startsWith('Removed letter')),
          move: actions.some((action: any) => action === 'Moved letters')
        };
      } else {
        // New ScoringAction format
        return {
          add: actions.some((action: any) => action.type === 'add'),
          remove: actions.some((action: any) => action.type === 'remove'), 
          move: actions.some((action: any) => action.type === 'rearrange')
        };
      }
    }
    
    return { add: false, remove: false, move: false };
  }, [pendingMoveAttempt]);

  // Score breakdown
  const scoreBreakdown: ScoreBreakdown = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { base: 0, keyBonus: 0, total: 0 };
    }
    
    const result = pendingMoveAttempt.scoringResult;
    
    // Handle both legacy and new ScoringResult formats
    if (result.baseScore !== undefined && result.keyLetterScore !== undefined) {
      // New format
      return {
        base: result.baseScore,
        keyBonus: result.keyLetterScore,
        total: result.totalScore
      };
    } else {
      // Legacy format fallback - try to extract from breakdown if it's an object
      const breakdown = result.breakdown as any;
      if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
        return {
          base: (breakdown.addLetterPoints || 0) + (breakdown.removeLetterPoints || 0) + (breakdown.movePoints || 0),
          keyBonus: breakdown.keyLetterUsagePoints || 0,
          total: result.totalScore
        };
      } else {
        // Fallback to score only
        return {
          base: result.score || result.totalScore || 0,
          keyBonus: 0,
          total: result.totalScore || result.score || 0
        };
      }
    }
  }, [pendingMoveAttempt]);

  // Word trail with move details
  const wordTrailMoves: WordMove[] = React.useMemo(() => {
    console.log('[DEBUG] WordTrail: gameState keys:', Object.keys(gameState));
    console.log('[DEBUG] WordTrail: gameStatus:', gameState.gameStatus);
    console.log('[DEBUG] WordTrail: currentTurn:', gameState.currentTurn);
    console.log('[DEBUG] WordTrail: turnHistory length:', gameState.turnHistory.length);
    console.log('[DEBUG] WordTrail: turnHistory:', gameState.turnHistory);
    
    const moves = gameState.turnHistory.map((turn) => {
      // Handle both legacy and new ScoringResult formats
      const scoringBreakdown = turn.scoringBreakdown;
      const actions = Array.isArray(scoringBreakdown.breakdown) 
        ? scoringBreakdown.breakdown 
        : scoringBreakdown.actions || [];
      
      const keyLettersUsed = scoringBreakdown.keyLettersUsed || 
                            (scoringBreakdown as any).keyLettersUsed || 
                            [];
      
      // Create scoreBreakdown object for WordTrail compatibility
      const scoreBreakdown = {
        addLetterPoints: scoringBreakdown.baseScore || 0,
        removeLetterPoints: 0, 
        movePoints: 0,
        keyLetterUsagePoints: scoringBreakdown.keyLetterScore || 0
      };
      
      return {
        word: turn.newWord,
        score: turn.score,
        player: turn.playerId,
        opponentName: turn.playerId === 'bot' && config?.botId ? getBotDisplayName(config.botId) : undefined,
        turnNumber: turn.turnNumber,
        actions,
        keyLetters: keyLettersUsed,
        scoreBreakdown
      };
    });
    
    console.log('[DEBUG] WordTrail: processed moves:', moves);
    return moves;
  }, [gameState.turnHistory, config?.botId]);

  // Event handlers
  const handleActionClick = useCallback((action: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    switch (action) {
      case '←': // Return to home (reset to current word)
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        break;
      case '↻': // Reset word (reset to current word)
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        break;
      case '?': // Help
        handleHelp();
        break;
      case '≡': // Settings
        handleSettings();
        break;
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord]);

  const handleWordChange = useCallback((newWord: string) => {
    if (!isPlayerTurn || isProcessingMove) {
      return;
    }
    
    setPendingWord(newWord);
    setShowValidationError(false); // Reset error display when word changes
    
    // Validate the move attempt
    if (newWord !== wordState.currentWord) {
      const attempt = actions.attemptMove(newWord);
      setPendingMoveAttempt(attempt);
    } else {
      setPendingMoveAttempt(null);
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, actions]);

  const handleLetterClick = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    // Add letter to pending word
    if (pendingWord.length < 10) { // Max word length
      const newWord = pendingWord + letter;
      handleWordChange(newWord);
    }
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleLetterDragStart = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    setDraggedLetter(letter);
  }, [isPlayerTurn, isProcessingMove]);

  const handleLetterDragEnd = useCallback(() => {
    setDraggedLetter(null);
  }, []);

  const handleWordBuilderMouseUp = useCallback((_e: React.MouseEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      const newWord = pendingWord + draggedLetter;
      handleWordChange(newWord);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleWordBuilderTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      const newWord = pendingWord + draggedLetter;
      handleWordChange(newWord);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleLetterRemove = useCallback((index: number) => {
    if (!isPlayerTurn || isProcessingMove) {
      return;
    }
    
    if (disableLetterRemoval) {
      console.log('[Tutorial] Letter removal disabled in Step 3');
      return;
    }
    
    if (index < 0 || index >= pendingWord.length) {
      return;
    }
    
    const letters = pendingWord.split('');
    letters.splice(index, 1);
    const newWord = letters.join('');
    
    handleWordChange(newWord);
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange, disableLetterRemoval]);

  const handleSubmit = useCallback(async () => {
    
    if (!isPlayerTurn || isProcessingMove) return;
    
    // Handle clicking X to pass turn (valid for any non-winning move)
    if (!isValidSubmit) {
      if (!showValidationError) {
        // First click on X shows validation error
        setShowValidationError(true);
        return;
      } else if (showValidationError) {
        // Second click on X (with validation error showing) immediately passes the turn
        actions.passTurn();
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
        return;
      }
    }
    
    // Handle normal valid submission
    if (pendingMoveAttempt?.canApply) {
      const success = actions.applyMove(pendingMoveAttempt);
      if (success) {
        // Check for unlock triggers when word is successfully submitted
        await handleWordSubmission(pendingMoveAttempt.newWord);
        
        setPendingWord(pendingMoveAttempt.newWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
      }
    }
  }, [isPlayerTurn, isProcessingMove, pendingMoveAttempt, actions, wordState.currentWord, showValidationError, handleWordSubmission]);

  const handleStartGame = useCallback(async () => {
    await actions.startGame();
    setShowGameEnd(false);
  }, [actions]);

  // Auto-start the game when component mounts (skip welcome screen)
  useEffect(() => {
    if (!isGameActive && !isGameFinished) {
      handleStartGame();
    }
  }, [isGameActive, isGameFinished, handleStartGame]);

  const handleResetGame = useCallback(() => {
    actions.resetGame();
    setPendingWord('');
    setPendingMoveAttempt(null);
    setShowGameEnd(false);
  }, [actions]);

  // Determine if submit is valid
  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  
  // The X should always be clickable unless we have a valid move to submit
  // This allows users to pass even without attempting to change the word
  const showInvalidX = !isValidSubmit;

  // Helper function to generate word suggestions
  const generateWordSuggestions = useCallback((currentWord: string): string[] => {
    const currentWordUpper = currentWord.toUpperCase();
    
    // Common variations to try
    const commonVariations = [
      // Add S
      currentWordUpper + 'S',
      // Add common endings
      currentWordUpper + 'ED',
      currentWordUpper + 'ING',
      currentWordUpper + 'ER',
      currentWordUpper + 'LY',
      // Remove last letter if word is long enough
      ...(currentWordUpper.length > 3 ? [currentWordUpper.slice(0, -1)] : []),
      // Common word transformations based on current word
      ...(currentWordUpper === 'CAT' ? ['CATS', 'BAT', 'HAT', 'MAT', 'RAT'] : []),
      ...(currentWordUpper === 'CATS' ? ['CAT', 'BATS', 'HATS', 'MATS', 'RATS'] : []),
      ...(currentWordUpper === 'PLAY' ? ['PLAYS', 'PLAN', 'PLAT', 'CLAY', 'SLAY'] : []),
      ...(currentWordUpper === 'WORD' ? ['WORDS', 'WORK', 'WORN', 'CORD', 'LORD'] : []),
      // Some always valid backup words
      'CAT', 'CATS', 'DOG', 'DOGS', 'PLAY', 'PLAYS', 'GAME', 'GAMES', 'WORD', 'WORDS'
    ];
    
    // Filter to only valid dictionary words and not already used
    const validSuggestions = commonVariations.filter(word => 
      isValidDictionaryWord(word) && 
      !wordState.usedWords.includes(word) &&
      word !== currentWordUpper
    );
    
    // Remove duplicates and return first 8
    return [...new Set(validSuggestions)].slice(0, 8);
  }, [wordState.usedWords]);

  const handleHelp = useCallback(() => {
    // Show help modal or navigate to help
  }, []);

  const handleSettings = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleResign = useCallback(() => {
    // Call the parent's resign handler to show quitter overlay
    if (onResign) {
      onResign();
    }
  }, [onResign]);



  return (
    <div className="interactive-game">

      {/* Error display */}
      {lastError && (
        <div className="interactive-game__error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Game header - only show when game is finished and in tutorial mode */}
      {isGameFinished && showGameEnd && currentGameMode === 'tutorial' && (
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>Game Over!</h2>
              <div className="interactive-game__winner">
                {gameState.winner ? `${gameState.winner.name} Wins!` : "It's a Tie!"}
              </div>
              <div className="interactive-game__final-scores">
                <div>You: {gameStats.humanScore}</div>
                <div>Bot: {gameStats.botScore}</div>
              </div>
              <button 
                className="interactive-game__reset-btn"
                onClick={currentGameMode === 'tutorial' ? onNavigateHome : handleResetGame}
                type="button"
              >
                {currentGameMode === 'tutorial' ? 'Home' : 'New Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      {isGameActive && (
        <div className="interactive-game__board">
          <div className="interactive-game__centered-container">
            {/* Submit anchor - the absolute center point */}
            <div className="interactive-game__submit-anchor">
              <ScoreDisplay
                score={scoreBreakdown}
                actions={actionState}
                isValid={!showInvalidX}
                isPassConfirming={false}
                passReason={null}
                onClick={!isProcessingMove && isPlayerTurn ? handleSubmit : undefined}
                className="interactive-game__score"
                isPassMode={false}
                validationError={pendingMoveAttempt?.validationResult?.userMessage || null}
                showValidationError={showValidationError}
              />
            </div>

            {/* Word trail positioned above submit anchor */}
            <div className="interactive-game__word-trail-positioned">
              <WordTrail
                moves={wordTrailMoves}
                showScores={true}
                showTurnNumbers={true}
                maxVisible={5}
              />
            </div>
            
            {/* Word builder positioned below submit anchor */}
            {isPlayerTurn && (
              <div className="interactive-game__word-builder-positioned">
                <div
                  onMouseUp={handleWordBuilderMouseUp}
                  onTouchEnd={handleWordBuilderTouchEnd}
                >
                  <WordBuilder
                    currentWord={pendingWord}
                    wordHighlights={pendingWordHighlights}
                    onWordChange={handleWordChange}
                    onLetterClick={handleLetterRemove}
                    disabled={isProcessingMove}
                    maxLength={10}
                    minLength={3}
                  />
                </div>
              </div>
            )}

            {/* Alphabet grid positioned below word builder */}
            <div className="interactive-game__grid-positioned">
              <AlphabetGrid
                letterStates={letterStates}
                onLetterClick={handleLetterClick}
                onActionClick={handleActionClick}
                onLetterDragStart={handleLetterDragStart}
                onLetterDragEnd={handleLetterDragEnd}
                disabled={!isPlayerTurn || isProcessingMove}
                enableDrag={true} // Enable drag for mobile and desktop
              />
            </div>
          </div>
        </div>
      )}

      {/* Debug Dialog */}
      <DebugDialog
        isOpen={isDebugDialogOpen}
        onClose={() => setIsDebugDialogOpen(false)}
        gameStats={gameStats}
        wordState={wordState}
        pendingWord={pendingWord}
        pendingMoveAttempt={pendingMoveAttempt}
        isPlayerTurn={isPlayerTurn}
        isBotTurn={isBotTurn}
        isBotThinking={isBotThinking}
        generateWordSuggestions={generateWordSuggestions}
        onWordChange={handleWordChange}
        isProcessingMove={isProcessingMove}
      />

      {/* Menu */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onDebugOpen={() => setIsDebugDialogOpen(true)}
        onResign={handleResign}
        onNavigateHome={onNavigateHome}
        onStartGame={(gameType, botId) => {
          // Forward bot selection to parent App.tsx
          onStartGame?.(gameType, botId);
        }}
        isInGame={true}
        currentGameMode={currentGameMode}
      />

    </div>
  );
}; 