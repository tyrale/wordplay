/**
 * Challenge Game Component
 * 
 * Uses only the agnostic challenge engine for state management.
 * Maintains architectural purity by avoiding web-specific useGameState hook.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AlphabetGrid, type LetterState } from '../game/AlphabetGrid';
import { WordTrail, type WordMove } from '../game/WordTrail';
import { WordBuilder } from '../game/WordBuilder';
import { type LetterHighlight } from '../game/CurrentWord';
import { ScoreDisplay, type ScoreBreakdown, type ActionState } from '../game/ScoreDisplay';
import { Menu } from '../ui/Menu';
import { useChallenge } from '../../hooks/useChallenge';
import { createBrowserAdapter } from '../../adapters/browserAdapter';
import type { GameStateDependencies } from '../../../packages/engine/gamestate';

export interface ChallengeGameProps {
  onComplete?: (completed: boolean, stepCount: number) => void;
  onBack?: () => void;
}

export const ChallengeGame: React.FC<ChallengeGameProps> = ({
  onComplete,
  onBack: _onBack
}) => {
  // Interface for validation result (compatible with existing UI components)
  interface ValidationResult {
    isValid: boolean;
    canApply: boolean;
    userMessage?: string;
    reason?: string;
    actionState?: ActionState; // Add action state to validation result
    scoreBreakdown?: ScoreBreakdown; // Add score breakdown for action analysis
  }

  // Challenge state management (agnostic engine only)
  const {
    challengeState,
    isLoading,
    isInitialized,
    startChallenge,
    submitWord,
    forfeitChallenge,
    error: challengeError
  } = useChallenge();

  // Local UI state
  const [pendingWord, setPendingWord] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [gameDependencies, setGameDependencies] = useState<GameStateDependencies | null>(null);

  // Initialize agnostic game engine dependencies
  useEffect(() => {
    const initializeGameDependencies = async () => {
      try {
        const adapter = await createBrowserAdapter();
        const dependencies = adapter.getGameDependencies();
        setGameDependencies(dependencies);
      } catch (err) {
        console.error('Failed to initialize game dependencies:', err);
      }
    };

    initializeGameDependencies();
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

  // Validate pending word using agnostic game engine
  const validatePendingWord = useCallback((word: string): ValidationResult => {
    if (!challengeState || !word || word === challengeState.currentWord || !gameDependencies) {
      return { isValid: false, canApply: false };
    }

    // Check if word was already used in challenge
    if (challengeState.wordSequence.includes(word)) {
      return {
        isValid: false,
        canApply: false,
        userMessage: 'already used',
        reason: 'Word already used in challenge'
      };
    }

    // Use agnostic game engine validation (same as vs-bot mode)
    const validationResult = gameDependencies.validateWord(word, {
      isBot: false,
      previousWord: challengeState.currentWord
    });

    if (!validationResult.isValid) {
      return {
        isValid: false,
        canApply: false,
        userMessage: validationResult.userMessage || 'invalid word',
        reason: validationResult.reason || 'Invalid word'
      };
    }

    // Additional validation: use agnostic engine's move validation
    const isMoveValid = gameDependencies.isValidMove(challengeState.currentWord, word);
    
    if (!isMoveValid) {
      return {
        isValid: false,
        canApply: false,
        userMessage: 'illegal action',
        reason: 'Invalid move transformation'
      };
    }

    // Calculate action states using agnostic engine's scoring system
    // Even though we don't show scores in challenge mode, we need action analysis for UI feedback
    const scoringResult = gameDependencies.calculateScore(
      challengeState.currentWord,
      word,
      { keyLetters: [] } // No key letters in challenge mode
    );

    // Extract action states from scoring result
    const actionState: ActionState = {
      add: scoringResult.actions.some((action: string) => action.startsWith('Added letter')),
      remove: scoringResult.actions.some((action: string) => action.startsWith('Removed letter')),
      move: scoringResult.actions.some((action: string) => action === 'Moved letters')
    };

    // Create score breakdown (not displayed but needed for consistency)
    const scoreBreakdown: ScoreBreakdown = {
      base: scoringResult.breakdown.addLetterPoints + scoringResult.breakdown.removeLetterPoints + scoringResult.breakdown.movePoints,
      keyBonus: 0, // No key letter bonus in challenge mode
      total: 0 // Don't show total score in challenge mode
    };

    return {
      isValid: true,
      canApply: true,
      actionState,
      scoreBreakdown
    };
  }, [challengeState, gameDependencies]);

  // Update validation when pending word changes
  useEffect(() => {
    if (pendingWord && challengeState && gameDependencies) {
      const result = validatePendingWord(pendingWord);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [pendingWord, challengeState, gameDependencies, validatePendingWord]);

  // Event handlers
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
        setValidationResult(null);
        setShowValidationError(false);
        break;
      case '≡': // Settings
        setIsMenuOpen(true);
        break;
    }
  }, [isProcessingMove, challengeState?.currentWord]);

  const handleSubmit = useCallback(async () => {
    if (isProcessingMove) return;

    // Handle clicking X to show validation error / forfeit
    if (!validationResult?.canApply) {
      if (!showValidationError) {
        // First click on X shows validation error
        setShowValidationError(true);
        return;
      } else if (showValidationError) {
        // Second click on X (with validation error showing) forfeits the challenge
        try {
          setIsProcessingMove(true);
          await forfeitChallenge();
          onComplete?.(false, challengeState?.wordSequence.length || 0);
        } catch (err) {
          console.error('Failed to forfeit challenge:', err);
        } finally {
          setIsProcessingMove(false);
        }
        return;
      }
    }

    // Handle normal valid submission using challenge engine
    if (validationResult?.canApply) {
      try {
        setIsProcessingMove(true);
        const result = await submitWord(pendingWord);
        
        if (result.success) {
          // Word was successfully submitted, pending word becomes current word
          setPendingWord(pendingWord); // Keep the word that was just submitted
          setValidationResult(null);
          setShowValidationError(false);
          
          // Check if challenge is complete (challengeState will be updated by useChallenge)
          // The completion check will happen in the next render cycle
        } else {
          setShowValidationError(true);
        }
      } catch (err) {
        setShowValidationError(true);
      } finally {
        setIsProcessingMove(false);
      }
    }
  }, [isProcessingMove, validationResult, showValidationError, forfeitChallenge, onComplete, challengeState, submitWord, pendingWord]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Check for challenge completion
  useEffect(() => {
    if (challengeState?.completed) {
      onComplete?.(true, challengeState.wordSequence.length);
    }
  }, [challengeState?.completed, challengeState?.wordSequence.length, onComplete]);

  // Generate letter states (no special states in challenge mode)
  const letterStates: LetterState[] = useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.split('').map(letter => ({
      letter,
      state: 'normal' as const
    }));
  }, []);

  // Word trail shows challenge sequence + target
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

  // No highlighting in challenge mode
  const pendingWordHighlights: LetterHighlight[] = useMemo(() => {
    return [];
  }, []);

  // Score breakdown from validation result (not displayed but needed for action analysis)
  const scoreBreakdown: ScoreBreakdown = useMemo(() => {
    return validationResult?.scoreBreakdown || { base: 0, keyBonus: 0, total: 0 };
  }, [validationResult]);

  // Action states from validation result (needed for checkmark/X display)
  const actionState: ActionState = useMemo(() => {
    return validationResult?.actionState || { add: false, remove: false, move: false };
  }, [validationResult]);

  // Determine if submit is valid
  const isValidSubmit = validationResult?.canApply || false;
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
          {challengeError || 'Failed to load challenge. Please try again.'}
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-game">

      {/* Error display */}
      {challengeError && (
        <div className="interactive-game__error" role="alert">
          <span>{challengeError}</span>
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
                validationError={validationResult?.userMessage || null}
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