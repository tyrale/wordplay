import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayerGameState } from '../../hooks/useMultiplayerGameState';
import { AlphabetGrid } from '../game/AlphabetGrid';
import { WordTrail } from '../game/WordTrail';
import { ScoreDisplay } from '../game/ScoreDisplay';
import { WordBuilder } from '../game/WordBuilder';
import type { LetterState } from '../game/AlphabetGrid';
import type { LetterHighlight, WordMove } from '../index';
import type { ScoringAction, MoveAttempt } from '../../../packages/engine/interfaces';
import './MultiplayerGame.css';

export interface MultiplayerGameProps {
  gameId: string;
  onExit: () => void;
  onGameEnd?: (winnerId: string | null, localPlayerId: string | null) => void;
}

export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ gameId, onExit, onGameEnd }) => {
  const {
    gameState,
    actions,
    localPlayerId,
    isLocalPlayerTurn,
    isGameActive,
    isGameFinished,
    isProcessingMove,
    isLoading,
    lastError,
    clearError
  } = useMultiplayerGameState({
    gameId,
    onGameStateChange: (state) => {
      if (state.gameStatus === 'finished' && onGameEnd) {
        onGameEnd(state.winner?.id ?? null, localPlayerId);
      }
    }
  });

  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isResigning, setIsResigning] = useState(false);

  useEffect(() => {
    setPendingWord(gameState.currentWord);
  }, [gameState.currentWord]);

  const letterStates: LetterState[] = React.useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return alphabet.map(letter => {
      if (gameState.keyLetters.includes(letter)) return { letter, state: 'key' as const };
      if (gameState.lockedLetters.includes(letter) || gameState.lockedKeyLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      return { letter, state: 'normal' as const };
    });
  }, [gameState.keyLetters, gameState.lockedLetters, gameState.lockedKeyLetters]);

  const pendingWordHighlights: LetterHighlight[] = React.useMemo(() => {
    return pendingWord
      .split('')
      .map((letter, index) => {
        if (gameState.lockedKeyLetters.includes(letter)) return { index, type: 'lockedKey' as const };
        if (gameState.keyLetters.includes(letter)) return { index, type: 'key' as const };
        if (gameState.lockedLetters.includes(letter)) return { index, type: 'locked' as const };
        return null;
      })
      .filter((h): h is LetterHighlight => h !== null);
  }, [pendingWord, gameState.keyLetters, gameState.lockedLetters, gameState.lockedKeyLetters]);

  const scoreBreakdown = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) return { base: 0, keyBonus: 0, total: 0 };
    const result = pendingMoveAttempt.scoringResult;
    return { base: result.baseScore, keyBonus: result.keyLetterScore, total: result.totalScore };
  }, [pendingMoveAttempt]);

  const actionState = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) return { add: false, remove: false, move: false };
    const acts: ScoringAction[] = pendingMoveAttempt.scoringResult.actions;
    return {
      add: acts.some(a => a.type === 'add'),
      remove: acts.some(a => a.type === 'remove'),
      move: acts.some(a => a.type === 'rearrange')
    };
  }, [pendingMoveAttempt]);

  const wordTrailMoves: WordMove[] = React.useMemo(() => {
    return gameState.turnHistory.map(turn => ({
      word: turn.newWord,
      score: turn.score,
      player: turn.playerId,
      opponentName: undefined,
      turnNumber: turn.turnNumber,
      keyLetters: turn.scoringBreakdown.keyLettersUsed || [],
      scoreBreakdown: turn.scoringBreakdown.breakdown
    }));
  }, [gameState.turnHistory]);

  const handleWordChange = useCallback((newWord: string) => {
    if (!isLocalPlayerTurn || isProcessingMove) return;
    setPendingWord(newWord);
    setShowValidationError(false);
    if (newWord !== gameState.currentWord) {
      setPendingMoveAttempt(actions.attemptMove(newWord));
    } else {
      setPendingMoveAttempt(null);
    }
  }, [isLocalPlayerTurn, isProcessingMove, gameState.currentWord, actions]);

  const handleLetterClick = useCallback((letter: string) => {
    if (!isLocalPlayerTurn || isProcessingMove) return;
    if (pendingWord.length < 10) {
      handleWordChange(pendingWord + letter);
    }
  }, [isLocalPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleLetterRemove = useCallback((info: { letter: string; index: number }) => {
    if (!isLocalPlayerTurn || isProcessingMove) return;
    if (info.index < 0 || info.index >= pendingWord.length) return;
    const letters = pendingWord.split('');
    letters.splice(info.index, 1);
    handleWordChange(letters.join(''));
  }, [isLocalPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const isValidSubmit = pendingMoveAttempt?.canApply || false;

  const handleSubmit = useCallback(() => {
    if (!isLocalPlayerTurn || isProcessingMove) return;

    if (!isValidSubmit) {
      if (!showValidationError) {
        setShowValidationError(true);
        return;
      }
      actions.passTurn();
      setPendingWord(gameState.currentWord);
      setPendingMoveAttempt(null);
      setShowValidationError(false);
      return;
    }

    if (pendingMoveAttempt?.canApply) {
      const success = actions.applyMove(pendingMoveAttempt);
      if (success) {
        setPendingWord(pendingMoveAttempt.newWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
      }
    }
  }, [isLocalPlayerTurn, isProcessingMove, isValidSubmit, showValidationError, actions, gameState.currentWord, pendingMoveAttempt]);

  const handleResign = useCallback(async () => {
    setIsResigning(true);
    try {
      await actions.resign();
    } finally {
      setIsResigning(false);
      onExit();
    }
  }, [actions, onExit]);

  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const opponent = gameState.players.find(p => p.id !== localPlayerId);

  if (isLoading) {
    return (
      <div className="multiplayer-game multiplayer-game__loading">
        <p>Loading game…</p>
      </div>
    );
  }

  return (
    <div className="multiplayer-game">
      <div className="multiplayer-game__header">
        <button className="multiplayer-game__back" onClick={onExit} aria-label="Back to menu">←</button>
        <div className="multiplayer-game__scores">
          <div className={`multiplayer-game__player ${!isLocalPlayerTurn ? 'multiplayer-game__player--active' : ''}`}>
            <span>{opponent?.name ?? 'Opponent'}</span>
            <span>{opponent?.score ?? 0}</span>
          </div>
          <div className={`multiplayer-game__player ${isLocalPlayerTurn ? 'multiplayer-game__player--active' : ''}`}>
            <span>You</span>
            <span>{localPlayer?.score ?? 0}</span>
          </div>
        </div>
        <button className="multiplayer-game__resign" onClick={handleResign} disabled={isResigning} aria-label="Resign">
          Resign
        </button>
      </div>

      {lastError && (
        <div className="multiplayer-game__error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {isGameFinished && (
        <div className="multiplayer-game__end">
          <h2>Game Over!</h2>
          <div className="multiplayer-game__winner">
            {gameState.winner
              ? gameState.winner.id === localPlayerId ? 'You Win!' : `${opponent?.name ?? 'Opponent'} Wins!`
              : "It's a Tie!"}
          </div>
          <button onClick={onExit} type="button">Back to Menu</button>
        </div>
      )}

      {isGameActive && !isGameFinished && (
        <div className="multiplayer-game__board">
          {!isLocalPlayerTurn && (
            <div className="multiplayer-game__waiting">Waiting for {opponent?.name ?? 'opponent'}…</div>
          )}

          <div className="multiplayer-game__submit-anchor">
            <ScoreDisplay
              score={scoreBreakdown}
              actions={actionState}
              isValid={isValidSubmit}
              isPassConfirming={false}
              passReason={null}
              onClick={isLocalPlayerTurn && !isProcessingMove ? handleSubmit : undefined}
              isPassMode={false}
              validationError={pendingMoveAttempt?.validationResult?.userMessage || null}
              showValidationError={showValidationError}
            />
          </div>

          <div className="multiplayer-game__word-trail">
            <WordTrail moves={wordTrailMoves} showScores={true} showTurnNumbers={true} maxVisible={5} />
          </div>

          {isLocalPlayerTurn && (
            <div className="multiplayer-game__word-builder">
              <WordBuilder
                currentWord={pendingWord}
                wordHighlights={pendingWordHighlights}
                onWordChange={handleWordChange}
                onLetterClick={handleLetterRemove}
                disabled={isProcessingMove}
                maxLength={10}
                minLength={3}
                isEditing={true}
              />
            </div>
          )}

          <div className="multiplayer-game__grid">
            <AlphabetGrid
              letterStates={letterStates}
              onLetterClick={handleLetterClick}
              disabled={!isLocalPlayerTurn || isProcessingMove}
              enableDrag={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
