import React, { useState, useEffect, useCallback } from 'react';
import { useGameState, useGameStats, useWordState } from '../../hooks/useGameState';
import { AlphabetGrid } from './AlphabetGrid';
import { WordTrail } from './WordTrail';

import { ScoreDisplay } from './ScoreDisplay';
import { WordBuilder } from './WordBuilder';
import { DebugDialog } from './DebugDialog';

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

const isValidDictionaryWord = (word: string): boolean => false; // TODO: Replace with dependency injection in Step 3

import type { LetterState, ScoreBreakdown, LetterHighlight, WordMove } from '../index';
import type { ActionState } from './ScoreDisplay';
import './InteractiveGame.css';

export interface InteractiveGameProps {
  config?: GameConfig;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
}

export const InteractiveGame: React.FC<InteractiveGameProps> = ({
  config,
  onGameEnd
}) => {

  
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
    onGameStateChange: (state) => {
      if (state.gameStatus === 'finished' && onGameEnd) {
        const humanScore = state.players.find(p => p.id === 'human')?.score || 0;
        const botScore = state.players.find(p => p.id === 'bot')?.score || 0;
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
  const [isPassMode, setIsPassMode] = useState(false);
  // Dictionary is automatically initialized with the real engine

  // Initialize pending word with current word
  useEffect(() => {
    setPendingWord(wordState.currentWord);
  }, [wordState.currentWord]);

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
      // Add delay for better UX
      timeoutId = setTimeout(async () => {
        const botMove = await actions.makeBotMove();
        if (botMove) {
          // setBotMoveHistory(prev => [...prev, botMove]);
        }
      }, 1000); // 1 second delay to show bot is "thinking"
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isBotTurn, isGameActive, isBotThinking, actions.makeBotMove]); // Removed gameState.players to prevent retriggering

  // Letter grid state
  const letterStates: LetterState[] = React.useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return alphabet.map(letter => {
      // Locked key letters take priority (they were key letters that became locked)
      if (wordState.lockedKeyLetters.includes(letter)) {
        return { letter, state: 'lockedKey' as const };
      }
      if (wordState.keyLetters.includes(letter)) {
        return { letter, state: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      return { letter, state: 'normal' as const };
    });
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
    return {
      add: actions.some((action: string) => action.startsWith('Added letter')),
      remove: actions.some((action: string) => action.startsWith('Removed letter')),
      move: actions.some((action: string) => action === 'Rearranged letters')
    };
  }, [pendingMoveAttempt]);

  // Score breakdown
  const scoreBreakdown: ScoreBreakdown = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { base: 0, keyBonus: 0, total: 0 };
    }
    
    const result = pendingMoveAttempt.scoringResult;
    return {
      base: result.breakdown.addLetterPoints + result.breakdown.removeLetterPoints + result.breakdown.rearrangePoints,
      keyBonus: result.breakdown.keyLetterUsagePoints,
      total: result.totalScore
    };
  }, [pendingMoveAttempt]);

  // Word trail with move details
  const wordTrailMoves: WordMove[] = React.useMemo(() => {
    const moves = gameState.turnHistory.map((turn) => ({
      word: turn.newWord,
      score: turn.score,
      player: turn.playerId,
      turnNumber: turn.turnNumber,
      actions: turn.scoringBreakdown.actions,
      keyLetters: turn.scoringBreakdown.keyLettersUsed || []
    }));
    
    // If in pass mode, add PASSED as the latest move
    if (isPassMode) {
      const passMove = {
        word: 'PASSED',
        score: 0,
        player: gameState.players.find(p => p.isCurrentPlayer)?.id || 'human',
        turnNumber: gameState.currentTurn,
        actions: [],
        keyLetters: []
      };
      return [
        ...moves,
        passMove
      ];
    }
    
    return moves;
  }, [gameState.turnHistory, isPassMode, gameState.players, gameState.currentTurn]);

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
    setIsPassMode(false); // Reset pass mode when word changes
    
    // Validate the move attempt
    if (newWord !== wordState.currentWord) {
      const attempt = actions.attemptMove(newWord);
      setPendingMoveAttempt(attempt);
    } else {
      setPendingMoveAttempt(null);
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, actions, pendingWord]);

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

    if (index < 0 || index >= pendingWord.length) {
      return;
    }
    
    const letters = pendingWord.split('');
    letters.splice(index, 1);
    const newWord = letters.join('');
    
    handleWordChange(newWord);
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleSubmit = useCallback(() => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    // Handle pass mode - first click on invalid X activates pass mode
    if (!pendingMoveAttempt?.canApply && !isPassMode) {
      setIsPassMode(true);
      return;
    }
    
    // Handle second click in pass mode - actually pass the turn
    if (isPassMode) {
      actions.passTurn();
      setPendingWord(wordState.currentWord);
      setPendingMoveAttempt(null);
      setIsPassMode(false);
      return;
    }
    
    // Handle normal valid submission
    if (pendingMoveAttempt?.canApply) {
      const success = actions.applyMove(pendingMoveAttempt);
      if (success) {
        setPendingWord(pendingMoveAttempt.newWord);
        setPendingMoveAttempt(null);
        setIsPassMode(false);
      }
    }
  }, [isPlayerTurn, isProcessingMove, pendingMoveAttempt, actions, isPassMode, wordState.currentWord]);

  const handleStartGame = useCallback(async () => {
    await actions.startGame();
    setShowGameEnd(false);
  }, [actions]);

  const handleResetGame = useCallback(() => {
    actions.resetGame();
    setPendingWord('');
    setPendingMoveAttempt(null);
    setShowGameEnd(false);
  }, [actions]);

  // Determine if submit is valid
  const isValidSubmit = pendingMoveAttempt?.canApply || false;

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
    // Show settings modal or navigate to settings
  }, []);

  return (
    <div className="interactive-game">
      {/* Debug button in top left */}
      <button
        className="interactive-game__debug-btn"
        onClick={() => setIsDebugDialogOpen(true)}
        aria-label="Open debug information"
        type="button"
      >
        🐛
      </button>

      {/* Error display */}
      {lastError && (
        <div className="interactive-game__error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Game header */}
      <div className="interactive-game__header">
        <div className="interactive-game__status">
          {!isGameActive && !isGameFinished && (
            <div className="interactive-game__start">
              <h2>Welcome to WordPlay</h2>
              <button 
                className="interactive-game__start-btn"
                onClick={handleStartGame}
                type="button"
              >
                Start Game
              </button>
            </div>
          )}
          
          {isGameFinished && showGameEnd && (
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
                onClick={handleResetGame}
                type="button"
              >
                New Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main game area */}
      {isGameActive && (
        <div className="interactive-game__board">
          <div className="interactive-game__centered-container">
            {/* Submit anchor - the absolute center point */}
            <div className="interactive-game__submit-anchor">
              <ScoreDisplay
                score={scoreBreakdown}
                actions={actionState}
                isValid={isValidSubmit}
                onClick={!isProcessingMove && isPlayerTurn ? handleSubmit : undefined}
                className="interactive-game__score"
                isPassMode={isPassMode}
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
    </div>
  );
}; 