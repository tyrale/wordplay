/**
 * Challenge Game Component
 * 
 * Main game screen for daily word transformation challenges.
 * Uses identical interface to vs bot game for consistency.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useChallenge } from '../../hooks/useChallenge';
import { WordTrail } from '../game/WordTrail';
import { AlphabetGrid } from '../game/AlphabetGrid';
import { WordBuilder } from '../game/WordBuilder';
import { ScoreDisplay } from '../game/ScoreDisplay';
import { createWebAdapter } from '../../adapters/webAdapter';
import type { LetterState } from '../game/AlphabetGrid';
import type { LetterHighlight } from '../game/CurrentWord';
import type { WordMove } from '../game/WordTrail';
import type { ScoreBreakdown, ActionState } from '../game/ScoreDisplay';
import './ChallengeGame.css';

// Initialize web adapter for proper game validation
let webAdapter: any = null;

const initializeWebAdapter = async () => {
  if (!webAdapter) {
    webAdapter = await createWebAdapter();
  }
  return webAdapter;
};

export interface ChallengeGameProps {
  onComplete?: (completed: boolean, stepCount: number) => void;
  onBack?: () => void;
}

interface MoveAttempt {
  newWord: string;
  isValid: boolean;
  validationResult: any;
  scoringResult: any;
  canApply: boolean;
  reason?: string;
}

export const ChallengeGame: React.FC<ChallengeGameProps> = ({
  onComplete,
  onBack
}) => {
  const {
    challengeState,
    isLoading,
    isInitialized,
    error,
    startChallenge,
    submitWord,
    forfeitChallenge,
    generateSharingText
  } = useChallenge();

  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isGiveUpConfirming, setIsGiveUpConfirming] = useState(false);

  // Initialize web adapter and challenge
  useEffect(() => {
    const initialize = async () => {
      await initializeWebAdapter();
      if (isInitialized && !challengeState) {
        startChallenge();
      }
    };
    initialize();
  }, [isInitialized, challengeState, startChallenge]);

  // Initialize pending word with current word
  useEffect(() => {
    if (challengeState) {
      setPendingWord(challengeState.currentWord);
    }
  }, [challengeState?.currentWord]);

  // Handle completion
  useEffect(() => {
    if (challengeState && (challengeState.completed || challengeState.failed)) {
      onComplete?.(challengeState.completed, challengeState.stepCount);
    }
  }, [challengeState, onComplete]);

  // Validate pending word using real game engine logic
  useEffect(() => {
    if (!challengeState || !webAdapter || !pendingWord.trim()) {
      setPendingMoveAttempt(null);
      return;
    }

    const validateMove = async () => {
      const wordToTest = pendingWord.trim().toUpperCase();
      
      // Skip validation if it's the same as current word
      if (wordToTest === challengeState.currentWord) {
        setPendingMoveAttempt(null);
        return;
      }

      try {
        // Use the real game engine validation logic
        const gameManager = webAdapter.createGameStateManager({
          maxTurns: 999,
          initialWord: challengeState.currentWord
        });
        
        // Set up the used words from challenge state
        const usedWords = new Set(challengeState.wordSequence);
        
        // Create a mock game state for validation
        const moveAttempt = gameManager.attemptMove(wordToTest);
        
        // Additional check: word must not be already used in challenge
        if (usedWords.has(wordToTest)) {
          setPendingMoveAttempt({
            newWord: wordToTest,
            isValid: false,
            validationResult: { 
              isValid: false, 
              reason: 'ALREADY_PLAYED',
              userMessage: 'was played',
              word: wordToTest 
            },
            scoringResult: null,
            canApply: false,
            reason: 'Word already used'
          });
          return;
        }

        setPendingMoveAttempt(moveAttempt);
      } catch (err) {
        console.error('Validation error:', err);
        setPendingMoveAttempt({
          newWord: wordToTest,
          isValid: false,
          validationResult: { 
            isValid: false, 
            reason: 'VALIDATION_ERROR',
            userMessage: 'validation failed',
            word: wordToTest 
          },
          scoringResult: null,
          canApply: false,
          reason: 'Validation failed'
        });
      }
    };

    validateMove();
  }, [pendingWord, challengeState, webAdapter]);

  // Handle word changes from WordBuilder
  const handleWordChange = useCallback((newWord: string) => {
    setPendingWord(newWord.toUpperCase());
    setShowValidationError(false);
  }, []);

  // Handle letter clicks from alphabet grid
  const handleLetterClick = useCallback((letter: string) => {
    if (isProcessingMove || !challengeState) return;
    
    const newWord = pendingWord + letter;
    setPendingWord(newWord.toUpperCase());
  }, [pendingWord, isProcessingMove, challengeState]);

  // Handle letter removal from word builder
  const handleLetterRemove = useCallback((index: number) => {
    if (isProcessingMove) return;
    
    const newWord = pendingWord.slice(0, index) + pendingWord.slice(index + 1);
    setPendingWord(newWord);
  }, [pendingWord, isProcessingMove]);

  // Handle action clicks (no special actions in challenge mode)
  const handleActionClick = useCallback(() => {
    // No special actions needed
  }, []);

  // Handle word submission
  const handleSubmit = useCallback(async () => {
    if (!challengeState || isProcessingMove || !pendingMoveAttempt?.canApply) {
      // If no valid move, handle give up
      if (!isGiveUpConfirming) {
        setIsGiveUpConfirming(true);
        return;
      }

      // Confirm give up
      setIsProcessingMove(true);
      try {
        await forfeitChallenge();
        setIsGiveUpConfirming(false);
      } catch (err) {
        console.error('Failed to forfeit challenge:', err);
      } finally {
        setIsProcessingMove(false);
      }
      return;
    }

    const wordToSubmit = pendingMoveAttempt.newWord;
    setIsProcessingMove(true);

    try {
      const result = await submitWord(wordToSubmit);
      
      if (result.success) {
        setPendingWord(wordToSubmit);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
      } else {
        setShowValidationError(true);
      }
    } catch (err) {
      setShowValidationError(true);
    } finally {
      setIsProcessingMove(false);
    }
  }, [challengeState, pendingMoveAttempt, isProcessingMove, isGiveUpConfirming, submitWord, forfeitChallenge]);

  // Generate letter states for alphabet grid (identical to vs bot)
  const letterStates = useMemo((): LetterState[] => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.split('').map(letter => ({
      letter,
      state: 'normal' as const
    }));
  }, []);

  // Generate word trail moves (identical to vs bot but no scores)
  const wordTrailMoves = useMemo((): WordMove[] => {
    if (!challengeState) return [];

    const moves: WordMove[] = [];
    
    // Add all played words with step numbers
    challengeState.wordSequence.forEach((word, index) => {
      moves.push({
        word,
        score: 0, // No scoring in challenge mode
        turnNumber: index
      });
    });

    return moves;
  }, [challengeState]);

  // Pending word highlights (identical to vs bot)
  const pendingWordHighlights = useMemo((): LetterHighlight[] => {
    // No key letters or locked letters in challenge mode
    return [];
  }, []);

  // Score breakdown for display (identical to vs bot)
  const scoreBreakdown = useMemo((): ScoreBreakdown => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { base: 0, keyBonus: 0, total: 0 };
    }
    
    const result = pendingMoveAttempt.scoringResult;
    return {
      base: result.totalScore || 0,
      keyBonus: 0, // No key letters in challenge mode
      total: result.totalScore || 0
    };
  }, [pendingMoveAttempt]);

  // Action state for display (identical to vs bot)
  const actionState = useMemo((): ActionState => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { add: false, remove: false, move: false };
    }
    
    const actions = pendingMoveAttempt.scoringResult.actions || [];
    return {
      add: actions.includes('add'),
      remove: actions.includes('remove'),
      move: actions.includes('rearrange')
    };
  }, [pendingMoveAttempt]);

  // Determine if submit is valid
  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  
  // Show invalid X when no valid move available
  const showInvalidX = !isValidSubmit;

  if (!isInitialized || isLoading) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__loading">
          <h2>Loading Challenge...</h2>
          <div className="interactive-game__spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onBack} className="interactive-game__reset-btn">
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!challengeState) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__loading">
          <h2>No Challenge Available</h2>
          <button onClick={startChallenge} className="interactive-game__reset-btn">
            Start Today's Challenge
          </button>
        </div>
      </div>
    );
  }

  if (challengeState.completed) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>🎉 Challenge Complete!</h2>
              <div className="interactive-game__winner">
                Solved in {challengeState.stepCount} steps!
              </div>
              <div className="interactive-game__final-scores">
                <div>{challengeState.startWord} → {challengeState.targetWord}</div>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(generateSharingText())}
                className="interactive-game__reset-btn"
              >
                Share Results
              </button>
              <button onClick={onBack} className="interactive-game__reset-btn">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (challengeState.failed) {
    return (
      <div className="interactive-game">
        <div className="interactive-game__header">
          <div className="interactive-game__status">
            <div className="interactive-game__end">
              <h2>Challenge Ended</h2>
              <div className="interactive-game__winner">
                Gave up after {challengeState.stepCount} steps
              </div>
              <div className="interactive-game__final-scores">
                <div>{challengeState.startWord} → {challengeState.targetWord}</div>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(generateSharingText())}
                className="interactive-game__reset-btn"
              >
                Share Attempt
              </button>
              <button onClick={onBack} className="interactive-game__reset-btn">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-game">
      {/* Error display (identical to vs bot) */}
      {pendingMoveAttempt?.validationResult && showValidationError && (
        <div className="interactive-game__error" role="alert">
          <span>{pendingMoveAttempt.validationResult.userMessage}</span>
          <button onClick={() => setShowValidationError(false)} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Main game area (identical to vs bot) */}
      <div className="interactive-game__board">
        <div className="interactive-game__centered-container">
          {/* Submit anchor - the absolute center point (identical to vs bot) */}
          <div className="interactive-game__submit-anchor">
            <ScoreDisplay
              score={scoreBreakdown}
              actions={actionState}
              isValid={!showInvalidX}
              isPassConfirming={isGiveUpConfirming}
              passReason={isGiveUpConfirming ? "Give Up" : null}
              onClick={!isProcessingMove ? handleSubmit : undefined}
              className="interactive-game__score"
              isPassMode={showInvalidX}
              validationError={pendingMoveAttempt?.validationResult?.userMessage || null}
              showValidationError={showValidationError}
            />
          </div>

          {/* Word trail positioned above submit anchor (identical to vs bot) */}
          <div className="interactive-game__word-trail-positioned">
            <WordTrail
              moves={wordTrailMoves}
              showScores={false}
              showTurnNumbers={true}
              maxVisible={5}
            />
          </div>
          
          {/* Word builder positioned below submit anchor (identical to vs bot) */}
          <div className="interactive-game__word-builder-positioned">
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

          {/* Alphabet grid positioned below word builder (identical to vs bot) */}
          <div className="interactive-game__grid-positioned">
            <AlphabetGrid
              letterStates={letterStates}
              onLetterClick={handleLetterClick}
              onActionClick={handleActionClick}
              disabled={isProcessingMove}
              enableDrag={true} // Enable drag like vs bot
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 