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
import { ChallengeCompletionOverlay } from '../ui/ChallengeCompletionOverlay';
import { useChallenge } from '../../hooks/useChallenge';
import { createBrowserAdapter } from '../../adapters/browserAdapter';
import { shareChallengeResult, getShareResultMessage } from '../../utils/shareUtils';
import { useToast } from '../ui/ToastManager';
import { useVanityFilter } from '../../hooks/useVanityFilter';
import type { GameStateDependencies } from '../../../packages/engine/gamestate';

export interface ChallengeGameProps {
  onComplete?: (completed: boolean, stepCount: number) => void;
  onBack?: () => void;
  onNavigateHome?: () => void;
  onResetChallenge?: () => void;
  onStartGame?: (gameType: 'bot' | 'challenge', botId?: string) => void;
}

export const ChallengeGame: React.FC<ChallengeGameProps> = ({
  onComplete,
  onBack,
  onNavigateHome,
  onResetChallenge,
  onStartGame
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
    generateSharingText,
    error: challengeError
  } = useChallenge();

  // Toast notifications
  const { showToast } = useToast();
  
  // Vanity filter integration
  const { getDisplayWord } = useVanityFilter();

  // Local UI state
  const [pendingWord, setPendingWord] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [gameDependencies, setGameDependencies] = useState<GameStateDependencies | null>(null);
  
  // Overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [overlayData, setOverlayData] = useState<{
    isWinner: boolean;
    shareText: string;
  } | null>(null);

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
      add: scoringResult.actions.some((action) => action.type === 'add'),
      remove: scoringResult.actions.some((action) => action.type === 'remove'),
      move: scoringResult.actions.some((action) => action.type === 'rearrange')
    };

    // Create score breakdown (not displayed but needed for consistency)
    const scoreBreakdown: ScoreBreakdown = {
      base: scoringResult.baseScore || 0,
      keyBonus: scoringResult.keyLetterScore || 0,
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

  // Handle resign - directly forfeit challenge and show completion overlay
  const handleResign = useCallback(async () => {
    try {
      setIsProcessingMove(true);
      await forfeitChallenge();
      
      // Generate sharing text for failed challenge
      const shareText = generateSharingText();
      
      // Show completion overlay immediately
      setOverlayData({
        isWinner: false,
        shareText
      });
      setShowCompletionOverlay(true);
    } catch (err) {
      console.error('Failed to forfeit challenge:', err);
    } finally {
      setIsProcessingMove(false);
    }
  }, [forfeitChallenge, generateSharingText]);

  // Overlay handlers
  const handleOverlayHome = useCallback(() => {
    setShowCompletionOverlay(false);
    setOverlayData(null);
    // Call onBack to navigate to main menu, then onComplete for any cleanup
    onBack?.();
    onComplete?.(challengeState?.completed || false, challengeState?.wordSequence.length || 0);
  }, [onBack, onComplete, challengeState?.completed, challengeState?.wordSequence.length]);

  const handleOverlayShare = useCallback(async (shareText: string) => {
    try {
      const result = await shareChallengeResult(shareText);
      const message = getShareResultMessage(result);
      
      showToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Shared!' : 'Share Failed',
        message,
        duration: 3000
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Share Failed',
        message: 'Unable to share challenge result. Please try again.',
        duration: 3000
      });
    }
  }, [showToast]);

  // Check for challenge completion or failure
  useEffect(() => {
    if (challengeState?.completed || challengeState?.failed) {
      const isWinner = challengeState.completed;
      const shareText = generateSharingText();
      
      setOverlayData({
        isWinner,
        shareText
      });
      setShowCompletionOverlay(true);
    }
  }, [challengeState?.completed, challengeState?.failed, generateSharingText]);

  // Generate letter states (no special states in challenge mode)
  const letterStates: LetterState[] = useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet.split('').map(letter => ({
      letter,
      state: 'normal' as const
    }));
  }, []);

  // Word trail shows only played words (start and target handled separately in challenge mode)
  const wordTrailMoves: WordMove[] = useMemo(() => {
    if (!challengeState) return [];

    const moves: WordMove[] = [];
    
    // Add played words in chronological order (excluding start word to avoid duplication)
    challengeState.wordSequence.forEach((word, index) => {
      // Skip start word if it appears in sequence to avoid duplication
      if (word !== challengeState.startWord) {
        moves.push({
          word,
          score: 0, // No scoring in challenge mode
          turnNumber: index + 1
        });
      }
    });

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

      {/* Main game area */}
      {!challengeState.completed && !challengeState.failed && (
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
                isChallengeMode={true}
              />
            </div>

            {/* Word trail positioned above submit anchor */}
            <div className="interactive-game__word-trail-positioned">
              <WordTrail
                moves={wordTrailMoves}
                showScores={false}
                showTurnNumbers={true}
                maxVisible={5}
                isChallengeMode={true}
                startWord={challengeState.startWord}
                targetWord={challengeState.targetWord}
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
                  isEditing={false}
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
        onResign={handleResign} // Use proper resign handler
        onNavigateHome={onNavigateHome}
        onStartGame={(gameType, botId) => {
          if (gameType === 'challenge') {
            onResetChallenge?.();
          } else if (gameType === 'bot' && botId) {
            // Forward bot selection to parent App.tsx for confirmation dialog
            onStartGame?.(gameType, botId);
          }
        }}
        isInGame={true}
        currentGameMode="challenge"
      />

      {/* Challenge Completion Overlay */}
      <ChallengeCompletionOverlay
        isVisible={showCompletionOverlay}
        isWinner={overlayData?.isWinner || false}
        shareText={overlayData?.shareText || ''}
        onHome={handleOverlayHome}
        onShare={handleOverlayShare}
      />

    </div>
  );
}; 