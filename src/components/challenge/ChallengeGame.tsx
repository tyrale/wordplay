/**
 * Challenge Game Component
 * 
 * Uses the exact same components and logic as vs bot mode for consistency.
 * Wraps the game engine to provide challenge-specific state management.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useChallenge } from '../../hooks/useChallenge';
import { AlphabetGrid } from '../game/AlphabetGrid';
import { WordTrail } from '../game/WordTrail';
import { WordBuilder } from '../game/WordBuilder';
import { ScoreDisplay } from '../game/ScoreDisplay';
import { Menu } from '../ui/Menu';
import { BrowserAdapter } from '../../adapters/browserAdapter';
import { createGameStateManagerWithDependencies } from '../../../packages/engine/gamestate';
import type { LetterState } from '../game/AlphabetGrid';
import type { LetterHighlight } from '../game/CurrentWord';
import type { WordMove } from '../game/WordTrail';
import type { ScoreBreakdown, ActionState } from '../game/ScoreDisplay';

export interface ChallengeGameProps {
  onComplete?: (completed: boolean, stepCount: number) => void;
  onBack?: () => void;
}

interface MoveAttempt {
  newWord: string;
  isValid: boolean;
  canApply: boolean;
  reason?: string;
}

export const ChallengeGame: React.FC<ChallengeGameProps> = ({
  onComplete,
  onBack
}) => {
  // Challenge state from hook
  const {
    challengeState,
    isLoading,
    isInitialized,
    error,
    startChallenge,
    submitWord,
    forfeitChallenge,
    isValidMove
  } = useChallenge();

  // Local UI state (identical to InteractiveGame)
  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isGiveUpConfirming, setIsGiveUpConfirming] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [gameManager, setGameManager] = useState<any>(null);

  // Initialize game manager for proper validation (like vs bot mode)
  useEffect(() => {
    const initializeGameManager = async () => {
      try {
        const browserAdapter = BrowserAdapter.getInstance();
        await browserAdapter.initialize();
        
        const dependencies = browserAdapter.getGameDependencies();
        const manager = createGameStateManagerWithDependencies(dependencies, {
          maxTurns: 999,
          initialWord: 'TEMP' // Will be updated when challenge loads
        });
        
        setGameManager(manager);
      } catch (error) {
        console.error('Failed to initialize game manager for validation:', error);
      }
    };

    initializeGameManager();
  }, []);

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
    }
  }, [challengeState?.currentWord]);

  // Validate moves (using real game engine validation like vs bot mode)
  useEffect(() => {
    if (!challengeState || !pendingWord || !gameManager) {
      setPendingMoveAttempt(null);
      return;
    }

    // Skip validation if it's the same as current word
    if (pendingWord === challengeState.currentWord) {
      setPendingMoveAttempt(null);
      return;
    }

    try {
      // Set the current word in the game manager to match challenge state
      gameManager.setWord(challengeState.currentWord);
      
      // Set up used words to prevent re-use
      const currentState = gameManager.getState();
      currentState.usedWords = [...challengeState.wordSequence];
      
      // Use the real game engine validation (same as vs bot mode)
      const attempt = gameManager.attemptMove(pendingWord);
      
      // Additional check: word must not be already used in challenge
      if (challengeState.wordSequence.includes(pendingWord)) {
        setPendingMoveAttempt({
          newWord: pendingWord,
          isValid: false,
          canApply: false,
          reason: 'Word already used'
        });
        return;
      }

      setPendingMoveAttempt(attempt);
    } catch (error) {
      console.error('Validation error:', error);
      setPendingMoveAttempt({
        newWord: pendingWord,
        isValid: false,
        canApply: false,
        reason: 'Validation failed'
      });
    }
  }, [pendingWord, challengeState, gameManager]);

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

    // Handle give up if no valid move
    if (!pendingMoveAttempt?.canApply) {
      if (!isGiveUpConfirming) {
        setIsGiveUpConfirming(true);
        setShowValidationError(true);
        return;
      }

      // Confirm give up
      setIsProcessingMove(true);
      try {
        await forfeitChallenge();
        onComplete?.(false, challengeState?.wordSequence.length || 0);
      } catch (err) {
        console.error('Failed to forfeit challenge:', err);
      } finally {
        setIsProcessingMove(false);
        setIsGiveUpConfirming(false);
      }
      return;
    }

    // Submit valid move
    setIsProcessingMove(true);
    try {
      const result = await submitWord(pendingMoveAttempt.newWord);
      
      if (result.success) {
        setPendingWord(pendingMoveAttempt.newWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
        setIsGiveUpConfirming(false);
        
        // Check if challenge is complete
        if (challengeState && challengeState.completed) {
          onComplete?.(true, challengeState.wordSequence.length);
        }
      } else {
        setShowValidationError(true);
      }
    } catch (err) {
      setShowValidationError(true);
    } finally {
      setIsProcessingMove(false);
    }
  }, [isProcessingMove, pendingMoveAttempt, isGiveUpConfirming, submitWord, forfeitChallenge, onComplete, challengeState]);

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

  // Generate word trail moves (identical to InteractiveGame structure)
  const wordTrailMoves: WordMove[] = useMemo(() => {
    if (!challengeState) return [];

    const moves: WordMove[] = [];
    
    // Add all played words
    challengeState.wordSequence.forEach((word, index) => {
      moves.push({
        word,
        score: 0, // No scoring in challenge mode
        turnNumber: index + 1
      });
    });

    // Add target word if available
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

  // Score breakdown (simplified for challenge mode)
  const scoreBreakdown: ScoreBreakdown = useMemo(() => {
    return { base: 0, keyBonus: 0, total: 0 };
  }, []);

  // Action state (simplified for challenge mode)
  const actionState: ActionState = useMemo(() => {
    return { add: false, remove: false, move: false };
  }, []);

  // Determine if submit is valid
  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  const showInvalidX = !isValidSubmit;

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__loading">
          Loading challenge...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__error">
          {error}
        </div>
      </div>
    );
  }

  // No challenge state
  if (!challengeState) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__loading">
          Starting challenge...
        </div>
      </div>
    );
  }

  // Game completed
  if (challengeState.completed) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>Challenge Complete!</h2>
              <div className="interactive-game__winner">
                Completed in {challengeState.wordSequence.length} steps
              </div>
              <button 
                className="interactive-game__reset-btn"
                onClick={() => onBack?.()}
                type="button"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game failed
  if (challengeState.failed) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>Challenge Failed</h2>
              <div className="interactive-game__winner">
                Better luck next time!
              </div>
              <button 
                className="interactive-game__reset-btn"
                onClick={() => onBack?.()}
                type="button"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active game (identical structure to InteractiveGame)
  return (
    <div className="interactive-game">
      {/* Main game area */}
      <div className="interactive-game__board">
        <div className="interactive-game__centered-container">
          {/* Submit anchor - the absolute center point */}
          <div className="interactive-game__submit-anchor">
            <ScoreDisplay
              score={scoreBreakdown}
              actions={actionState}
              isValid={!showInvalidX}
              isPassConfirming={isGiveUpConfirming}
              passReason={isGiveUpConfirming ? 'Give up?' : null}
              onClick={handleSubmit}
              className="interactive-game__score"
              isPassMode={false}
              validationError={pendingMoveAttempt?.reason || null}
              showValidationError={showValidationError}
            />
          </div>

          {/* Word trail positioned above submit anchor */}
          <div className="interactive-game__word-trail-positioned">
            <WordTrail
              moves={wordTrailMoves}
              showScores={false}
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

      {/* Menu */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        isInGame={true}
      />
    </div>
  );
}; 