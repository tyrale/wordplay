/**
 * Challenge Game Component
 * 
 * Uses the exact same components and logic as vs bot mode for consistency.
 * Wraps the game engine to provide challenge-specific state management.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AlphabetGrid, type LetterState } from '../game/AlphabetGrid';
import { WordTrail, type WordMove } from '../game/WordTrail';
import { WordBuilder } from '../game/WordBuilder';
import { type LetterHighlight } from '../game/CurrentWord';
import { ScoreDisplay, type ScoreBreakdown, type ActionState } from '../game/ScoreDisplay';
import { Menu } from '../ui/Menu';
import { useChallenge } from '../../hooks/useChallenge';
import { useGameState } from '../../hooks/useGameState';

export interface ChallengeGameProps {
  onComplete?: (completed: boolean, stepCount: number) => void;
  onBack?: () => void;
}

export const ChallengeGame: React.FC<ChallengeGameProps> = ({
  onComplete,
  onBack
}) => {
  // Challenge state management
  const {
    challengeState,
    isLoading,
    isInitialized,
    startChallenge,
    submitWord,
    forfeitChallenge
  } = useChallenge();

  // Unified game state management (same as vs bot mode)
  const {
    gameState,
    actions,
    isPlayerTurn,
    isGameActive,
    isProcessingMove,
    lastError,
    clearError
  } = useGameState({
    config: {
      maxTurns: 999,           // High limit for challenge mode
      allowBotPlayer: false,   // No bot in challenge mode
      enableKeyLetters: false, // No key letters in challenge mode
      enableLockedLetters: false,
      initialWord: challengeState?.currentWord || 'TEMP'
    }
  });

  // Local UI state (identical to InteractiveGame)
  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<any>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);

  // Initialize challenge on mount
  useEffect(() => {
    if (isInitialized && !challengeState && !isLoading) {
      startChallenge();
    }
  }, [isInitialized, challengeState, isLoading, startChallenge]);

  // Update pending word when challenge state changes
  useEffect(() => {
    if (challengeState?.currentWord) {
      setPendingWord(challengeState.currentWord);
      // Update game state to match challenge
      actions.setCurrentWord(challengeState.currentWord);
    }
  }, [challengeState?.currentWord]);

  // Start game when challenge is ready
  useEffect(() => {
    if (challengeState?.currentWord && isGameActive === false) {
      actions.startGame();
    }
  }, [challengeState?.currentWord, isGameActive]);

  // Validate moves using unified game state manager
  useEffect(() => {
    if (!challengeState || !pendingWord || !isGameActive) {
      setPendingMoveAttempt(null);
      return;
    }

    // Skip validation if it's the same as current word
    if (pendingWord === challengeState.currentWord) {
      setPendingMoveAttempt(null);
      return;
    }

    // Use unified validation (same as vs bot mode)
    const attempt = actions.attemptMove(pendingWord);
    
    // Additional challenge-specific check: word must not be already used in challenge
    if (challengeState.wordSequence.includes(pendingWord)) {
      setPendingMoveAttempt({
        ...attempt,
        isValid: false,
        validationResult: { 
          isValid: false, 
          reason: 'Word already used in challenge', 
          word: pendingWord,
          userMessage: 'already used'
        },
        canApply: false,
        reason: 'Word already used in challenge'
      });
      return;
    }

    setPendingMoveAttempt(attempt);
  }, [pendingWord, challengeState, isGameActive, actions]);

  // Event handlers (identical to InteractiveGame)
  const handleWordChange = useCallback((newWord: string) => {
    setPendingWord(newWord.toUpperCase());
    setShowValidationError(false);
  }, []);

  const handleLetterClick = useCallback((letter: string) => {
    if (isProcessingMove || !challengeState) return;
    
    const newWord = pendingWord + letter;
    if (newWord.length <= 10) {
      handleWordChange(newWord);
    }
  }, [pendingWord, isProcessingMove, challengeState, handleWordChange]);

  const handleLetterRemove = useCallback((index: number) => {
    if (isProcessingMove) return;
    
    const newWord = pendingWord.slice(0, index) + pendingWord.slice(index + 1);
    handleWordChange(newWord);
  }, [pendingWord, isProcessingMove, handleWordChange]);

  const handleLetterDragStart = useCallback((letter: string) => {
    if (isProcessingMove) return;
    setDraggedLetter(letter);
  }, [isProcessingMove]);

  const handleLetterDragEnd = useCallback(() => {
    setDraggedLetter(null);
  }, []);

  const handleWordBuilderMouseUp = useCallback((_e: React.MouseEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      handleWordChange(pendingWord + draggedLetter);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleWordBuilderTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      handleWordChange(pendingWord + draggedLetter);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleActionClick = useCallback((action: string) => {
    if (isProcessingMove) return;
    
    switch (action) {
      case '←': // Return to current word
      case '↻': // Reset word
        setPendingWord(challengeState?.currentWord || '');
        setPendingMoveAttempt(null);
        break;
      case '≡': // Settings
        setIsMenuOpen(true);
        break;
    }
  }, [isProcessingMove, challengeState?.currentWord]);

  const handleSubmit = useCallback(async () => {
    if (isProcessingMove) return;

    // Handle clicking X to show validation error / forfeit (same as vs bot mode)
    if (!pendingMoveAttempt?.canApply) {
      if (!showValidationError) {
        // First click on X shows validation error
        setShowValidationError(true);
        return;
      } else if (showValidationError) {
        // Second click on X (with validation error showing) forfeits the challenge
        try {
          await forfeitChallenge();
          onComplete?.(false, challengeState?.wordSequence.length || 0);
        } catch (err) {
          console.error('Failed to forfeit challenge:', err);
        }
        return;
      }
    }

    // Handle normal valid submission (challenge-specific logic)
    if (pendingMoveAttempt?.canApply) {
      try {
        const result = await submitWord(pendingMoveAttempt.newWord);
        
        if (result.success) {
          setPendingWord(pendingMoveAttempt.newWord);
          setPendingMoveAttempt(null);
          setShowValidationError(false);
          
          // Check if challenge is complete
          if (challengeState && challengeState.completed) {
            onComplete?.(true, challengeState.wordSequence.length);
          }
        } else {
          setShowValidationError(true);
        }
      } catch (err) {
        setShowValidationError(true);
      }
    }
  }, [isProcessingMove, pendingMoveAttempt, showValidationError, forfeitChallenge, onComplete, challengeState, submitWord]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Generate letter states (identical to InteractiveGame)
  const letterStates: LetterState[] = useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.split('').map(letter => ({
      letter,
      state: 'normal' as const
    }));
  }, []);

  // CHALLENGE-SPECIFIC: Word trail shows challenge sequence + target
  const wordTrailMoves: WordMove[] = useMemo(() => {
    if (!challengeState) return [];

    const moves: WordMove[] = [];
    
    // Add all played words (no scores in challenge mode)
    challengeState.wordSequence.forEach((word, index) => {
      moves.push({
        word,
        score: 0, // No scoring in challenge mode
        turnNumber: index + 1
      });
    });

    // Add target word if available and not yet reached
    if (challengeState.targetWord && !challengeState.wordSequence.includes(challengeState.targetWord)) {
      moves.push({
        word: challengeState.targetWord,
        score: 0,
        turnNumber: challengeState.wordSequence.length + 1
      });
    }

    return moves;
  }, [challengeState]);

  // Pending word highlights (no special highlighting in challenge mode)
  const pendingWordHighlights: LetterHighlight[] = useMemo(() => {
    return [];
  }, []);

  // CHALLENGE-SPECIFIC: No scoring, but use real validation data
  const scoreBreakdown: ScoreBreakdown = useMemo(() => {
    return { base: 0, keyBonus: 0, total: 0 }; // Always zero for challenge mode
  }, []);

  // CHALLENGE-SPECIFIC: Show action state but not scores
  const actionState: ActionState = useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { add: false, remove: false, move: false };
    }
    
    const actions = pendingMoveAttempt.scoringResult.actions;
    return {
      add: actions.some((action: string) => action.startsWith('Added letter')),
      remove: actions.some((action: string) => action.startsWith('Removed letter')),
      move: actions.some((action: string) => action === 'Moved letters')
    };
  }, [pendingMoveAttempt]);

  // Determine if submit is valid (same logic as vs bot mode)
  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  const showInvalidX = !isValidSubmit;

  if (isLoading) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__loading">
          Loading today's challenge...
        </div>
      </div>
    );
  }

  if (!challengeState) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__error">
          Failed to load challenge. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-game">

      {/* Error display */}
      {lastError && (
        <div className="interactive-game__error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Challenge completed */}
      {challengeState.completed && (
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>Challenge Complete!</h2>
              <div className="interactive-game__winner">
                Solved in {challengeState.wordSequence.length} steps!
              </div>
              <button 
                className="interactive-game__reset-btn"
                onClick={() => onComplete?.(true, challengeState.wordSequence.length)}
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      {!challengeState.completed && (
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
                onClick={handleSubmit}
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
                showScores={false} // CHALLENGE-SPECIFIC: No scores
                showTurnNumbers={true}
                maxVisible={5}
              />
            </div>
            
            {/* Word builder positioned below submit anchor */}
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

            {/* Alphabet grid positioned below word builder */}
            <div className="interactive-game__grid-positioned">
              <AlphabetGrid
                letterStates={letterStates}
                onLetterClick={handleLetterClick}
                onActionClick={handleActionClick}
                onLetterDragStart={handleLetterDragStart}
                onLetterDragEnd={handleLetterDragEnd}
                disabled={isProcessingMove}
                enableDrag={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onDebugOpen={() => {}} // No debug in challenge mode
        onResign={() => handleSubmit()} // Forfeit challenge
        isInGame={true}
      />

    </div>
  );
}; 