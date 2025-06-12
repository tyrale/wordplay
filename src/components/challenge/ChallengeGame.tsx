/**
 * Challenge Game Component
 * 
 * Main game screen for daily word transformation challenges.
 * Reuses existing game components but adapts them for challenge-specific gameplay.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useChallenge } from '../../hooks/useChallenge';
import { WordTrail } from '../game/WordTrail';
import { AlphabetGrid } from '../game/AlphabetGrid';
import { WordBuilder } from '../game/WordBuilder';
import { ScoreDisplay } from '../game/ScoreDisplay';
import type { LetterState } from '../game/AlphabetGrid';
import type { WordTrailMove } from '../game/WordTrail';
import './ChallengeGame.css';

export interface ChallengeGameProps {
  onComplete?: (completed: boolean, stepCount: number) => void;
  onBack?: () => void;
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
    generateSharingText,
    isValidMove
  } = useChallenge();

  const [pendingWord, setPendingWord] = useState('');
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isGiveUpConfirming, setIsGiveUpConfirming] = useState(false);

  // Initialize challenge when component mounts
  useEffect(() => {
    if (isInitialized && !challengeState) {
      startChallenge();
    }
  }, [isInitialized, challengeState, startChallenge]);

  // Handle completion
  useEffect(() => {
    if (challengeState && (challengeState.completed || challengeState.failed)) {
      onComplete?.(challengeState.completed, challengeState.stepCount);
    }
  }, [challengeState, onComplete]);

  // Handle word changes from WordBuilder
  const handleWordChange = useCallback((newWord: string) => {
    setPendingWord(newWord.toUpperCase());
    setValidationError(null);
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

  // Handle word submission
  const handleSubmit = useCallback(async () => {
    if (!challengeState || isProcessingMove || !pendingWord.trim()) return;

    const wordToSubmit = pendingWord.trim().toUpperCase();
    
    // Check if it's a valid move first
    if (!isValidMove(challengeState.currentWord, wordToSubmit)) {
      setValidationError('Invalid word transformation');
      setShowValidationError(true);
      return;
    }

    setIsProcessingMove(true);
    setValidationError(null);

    try {
      const result = await submitWord(wordToSubmit);
      
      if (result.success) {
        setPendingWord('');
        setValidationError(null);
        setShowValidationError(false);
      } else {
        setValidationError(result.error || 'Invalid word');
        setShowValidationError(true);
      }
    } catch (err) {
      setValidationError('Failed to submit word');
      setShowValidationError(true);
    } finally {
      setIsProcessingMove(false);
    }
  }, [challengeState, pendingWord, isProcessingMove, submitWord, isValidMove]);

  // Handle give up action
  const handleGiveUp = useCallback(async () => {
    if (!challengeState || isProcessingMove) return;

    if (!isGiveUpConfirming) {
      setIsGiveUpConfirming(true);
      return;
    }

    setIsProcessingMove(true);
    try {
      await forfeitChallenge();
      setIsGiveUpConfirming(false);
    } catch (err) {
      console.error('Failed to forfeit challenge:', err);
    } finally {
      setIsProcessingMove(false);
    }
  }, [challengeState, isProcessingMove, isGiveUpConfirming, forfeitChallenge]);

  // Generate letter states for alphabet grid
  const letterStates = React.useMemo((): LetterState[] => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.split('').map(letter => ({
      letter,
      state: 'available' as const,
      isKeyLetter: false,
      isLocked: false
    }));
  }, []);

  // Generate word trail moves
  const wordTrailMoves = React.useMemo((): WordTrailMove[] => {
    if (!challengeState) return [];

    const moves: WordTrailMove[] = [];
    
    // Add start word (accent color)
    moves.push({
      word: challengeState.startWord,
      score: 0,
      turnNumber: 0,
      isCurrentWord: false,
      isAccent: true
    });

    // Add player moves
    challengeState.wordSequence.slice(1).forEach((word, index) => {
      moves.push({
        word,
        score: 0, // No scoring in challenge mode
        turnNumber: index + 1,
        isCurrentWord: word === challengeState.currentWord,
        isAccent: false
      });
    });

    // Add target word at bottom (accent color)
    moves.push({
      word: challengeState.targetWord,
      score: 0,
      turnNumber: -1, // Special marker for target
      isCurrentWord: false,
      isAccent: true,
      isTarget: true
    });

    return moves;
  }, [challengeState]);

  // Check if current word in builder is valid for submission
  const isValidSubmit = React.useMemo(() => {
    if (!challengeState || !pendingWord.trim()) return false;
    return isValidMove(challengeState.currentWord, pendingWord.trim());
  }, [challengeState, pendingWord, isValidMove]);

  if (!isInitialized || isLoading) {
    return (
      <div className="challenge-game challenge-game--loading">
        <div className="challenge-game__loading">
          <h2>Loading Challenge...</h2>
          <div className="challenge-game__spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenge-game challenge-game--error">
        <div className="challenge-game__error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onBack} className="challenge-game__back-btn">
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!challengeState) {
    return (
      <div className="challenge-game challenge-game--no-state">
        <div className="challenge-game__no-state">
          <h2>No Challenge Available</h2>
          <button onClick={startChallenge} className="challenge-game__start-btn">
            Start Today's Challenge
          </button>
        </div>
      </div>
    );
  }

  if (challengeState.completed) {
    return (
      <div className="challenge-game challenge-game--completed">
        <div className="challenge-game__completion">
          <h2>🎉 Challenge Complete!</h2>
          <div className="challenge-game__result">
            <p>You solved it in <strong>{challengeState.stepCount}</strong> steps!</p>
            <p className="challenge-game__path">
              {challengeState.startWord} → {challengeState.targetWord}
            </p>
          </div>
          <div className="challenge-game__actions">
            <button 
              onClick={() => navigator.clipboard.writeText(generateSharingText())}
              className="challenge-game__share-btn"
            >
              Share Results
            </button>
            <button onClick={onBack} className="challenge-game__back-btn">
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (challengeState.failed) {
    return (
      <div className="challenge-game challenge-game--failed">
        <div className="challenge-game__failure">
          <h2>Challenge Ended</h2>
          <div className="challenge-game__result">
            <p>You gave up after <strong>{challengeState.stepCount}</strong> steps.</p>
            <p className="challenge-game__path">
              {challengeState.startWord} → {challengeState.targetWord}
            </p>
          </div>
          <div className="challenge-game__actions">
            <button 
              onClick={() => navigator.clipboard.writeText(generateSharingText())}
              className="challenge-game__share-btn"
            >
              Share Attempt
            </button>
            <button onClick={onBack} className="challenge-game__back-btn">
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="challenge-game">
      {/* Header with challenge info */}
      <div className="challenge-game__header">
        <div className="challenge-game__info">
          <h1>Daily Challenge</h1>
          <div className="challenge-game__target">
            Transform <span className="challenge-game__start-word">{challengeState.startWord}</span> 
            {' '} into <span className="challenge-game__target-word">{challengeState.targetWord}</span>
          </div>
          <div className="challenge-game__steps">
            Steps: {challengeState.stepCount}
          </div>
        </div>
        <button onClick={onBack} className="challenge-game__back-btn">
          ← Back
        </button>
      </div>

      {/* Error display */}
      {validationError && showValidationError && (
        <div className="challenge-game__error-banner" role="alert">
          <span>{validationError}</span>
          <button onClick={() => setShowValidationError(false)} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Main game area */}
      <div className="challenge-game__board">
        <div className="challenge-game__centered-container">
          {/* Submit button - center anchor */}
          <div className="challenge-game__submit-anchor">
            <ScoreDisplay
              score={{ total: 0, breakdown: { addLetterPoints: 0, removeLetterPoints: 0, movePoints: 0, keyLetterBonus: 0, total: 0 } }}
              actions={[]}
              isValid={isValidSubmit}
              isPassConfirming={isGiveUpConfirming}
              passReason={isGiveUpConfirming ? "Give Up" : null}
              onClick={isGiveUpConfirming ? handleGiveUp : (isValidSubmit ? handleSubmit : handleGiveUp)}
              className="challenge-game__score"
              isPassMode={!isValidSubmit || isGiveUpConfirming}
              validationError={validationError}
              showValidationError={showValidationError}
            />
          </div>

          {/* Word trail positioned above submit anchor */}
          <div className="challenge-game__word-trail-positioned">
            <WordTrail
              moves={wordTrailMoves}
              showScores={false}
              showTurnNumbers={true}
              maxVisible={8}
            />
          </div>
          
          {/* Word builder positioned below submit anchor */}
          <div className="challenge-game__word-builder-positioned">
            <WordBuilder
              currentWord={pendingWord}
              wordHighlights={[]}
              onWordChange={handleWordChange}
              onLetterClick={handleLetterRemove}
              disabled={isProcessingMove}
              maxLength={10}
              minLength={3}
            />
          </div>

          {/* Alphabet grid positioned below word builder */}
          <div className="challenge-game__grid-positioned">
            <AlphabetGrid
              letterStates={letterStates}
              onLetterClick={handleLetterClick}
              onActionClick={() => {}} // No special actions in challenge mode
              disabled={isProcessingMove}
              enableDrag={false} // Keep it simple for challenge mode
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 