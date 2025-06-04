import React, { useState, useEffect, useCallback } from 'react';
import { useGameState, useGameStats, useWordState } from '../../hooks/useGameState';
import { AlphabetGrid } from './AlphabetGrid';
import { WordTrail } from './WordTrail';
import { CurrentWord } from './CurrentWord';
import { ActionIndicators } from './ActionIndicators';
import { SubmitButton } from './SubmitButton';
import { ScoreDisplay } from './ScoreDisplay';
import { WordBuilder } from './WordBuilder';
import type { GameConfig, MoveAttempt } from '../../utils/browserGameEngine';
import type { LetterState, ActionState, ScoreBreakdown, LetterHighlight, WordMove } from '../index';
import './InteractiveGame.css';

export interface InteractiveGameProps {
  config?: GameConfig;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
  showDebugInfo?: boolean;
}

export const InteractiveGame: React.FC<InteractiveGameProps> = ({
  config,
  onGameEnd,
  showDebugInfo = false
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
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [showGameEnd, setShowGameEnd] = useState(false);

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

  // Auto-trigger bot moves
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
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isBotTurn, isGameActive, isBotThinking, actions]);

  // Letter grid state
  const letterStates: LetterState[] = React.useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return alphabet.map(letter => {
      if (wordState.keyLetters.includes(letter)) {
        return { letter, state: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      return { letter, state: 'normal' as const };
    });
  }, [wordState.keyLetters, wordState.lockedLetters]);

  // Word highlights for the current word display
  const wordHighlights: LetterHighlight[] = React.useMemo(() => {
    return wordState.currentWord.split('').map((letter, index) => {
      if (wordState.keyLetters.includes(letter)) {
        return { index, type: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { index, type: 'locked' as const };
      }
      return null;
    }).filter((highlight): highlight is LetterHighlight => highlight !== null);
  }, [wordState.currentWord, wordState.keyLetters, wordState.lockedLetters]);

  // Pending word highlights (for word builder)
  const pendingWordHighlights: LetterHighlight[] = React.useMemo(() => {
    return pendingWord.split('').map((letter, index) => {
      if (wordState.keyLetters.includes(letter)) {
        return { index, type: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { index, type: 'locked' as const };
      }
      return null;
    }).filter((highlight): highlight is LetterHighlight => highlight !== null);
  }, [pendingWord, wordState.keyLetters, wordState.lockedLetters]);

  // Action indicators based on pending move
  const actionState: ActionState = React.useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { add: false, remove: false, move: false };
    }
    
    const actions = pendingMoveAttempt.scoringResult.actions;
    return {
      add: actions.includes('add'),
      remove: actions.includes('remove'),
      move: actions.includes('rearrange')
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
    return gameState.turnHistory.map((turn) => ({
      word: turn.newWord,
      score: turn.score,
      player: turn.playerId,
      turnNumber: turn.turnNumber,
      actions: turn.scoringBreakdown.actions
    }));
  }, [gameState.turnHistory]);

  // Event handlers
  const handleLetterClick = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    // Add letter to pending word
    if (pendingWord.length < 10) { // Max word length
      setPendingWord(prev => prev + letter);
    }
  }, [isPlayerTurn, isProcessingMove, pendingWord.length]);

  const handleActionClick = useCallback((action: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    switch (action) {
      case '←': // Return to home (reset to current word)
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        break;
      case '↶': // Undo (reset to current word)
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        break;
      case '?': // Help
        // TODO: Show help modal
        console.log('Help requested');
        break;
      case '≡': // Settings
        // TODO: Show settings modal
        console.log('Settings requested');
        break;
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord]);

  const handleWordChange = useCallback((newWord: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    setPendingWord(newWord);
    
    // Validate the move attempt
    if (newWord !== wordState.currentWord) {
      const attempt = actions.attemptMove(newWord);
      setPendingMoveAttempt(attempt);
    } else {
      setPendingMoveAttempt(null);
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, actions]);

  const handleLetterRemove = useCallback((index: number) => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    const letters = pendingWord.split('');
    letters.splice(index, 1);
    const newWord = letters.join('');
    handleWordChange(newWord);
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleSubmit = useCallback(() => {
    if (!isPlayerTurn || isProcessingMove || !pendingMoveAttempt?.canApply) return;
    
    const success = actions.applyMove(pendingMoveAttempt);
    if (success) {
      setPendingWord(pendingMoveAttempt.newWord);
      setPendingMoveAttempt(null);
    }
  }, [isPlayerTurn, isProcessingMove, pendingMoveAttempt, actions]);

  const handlePassTurn = useCallback(() => {
    if (!isPlayerTurn || isProcessingMove) return;
    
    actions.passTurn();
    setPendingWord(wordState.currentWord);
    setPendingMoveAttempt(null);
  }, [isPlayerTurn, isProcessingMove, actions, wordState.currentWord]);

  const handleStartGame = useCallback(() => {
    actions.startGame();
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

  return (
    <div className="interactive-game">
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
          
          {isGameActive && (
            <div className="interactive-game__turn-info">
              <div className="interactive-game__turn">
                Turn {gameStats.currentTurn} of {gameStats.maxTurns}
              </div>
              <div className="interactive-game__player">
                {isPlayerTurn && 'Your Turn'}
                {isBotTurn && (isBotThinking ? 'Bot is thinking...' : 'Bot Turn')}
              </div>
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

        {/* Word trail */}
        {isGameActive && (
          <WordTrail
            moves={wordTrailMoves}
            showScores={true}
            showTurnNumbers={true}
            maxVisible={5}
          />
        )}
      </div>

      {/* Main game area */}
      {isGameActive && (
        <div className="interactive-game__board">
          {/* Current word display */}
          <div className="interactive-game__word-section">
            <CurrentWord
              word={wordState.currentWord}
              highlights={wordHighlights}
            />
            
            {/* Word builder for player turn */}
            {isPlayerTurn && (
              <div className="interactive-game__word-builder">
                <h3>Build Your Word:</h3>
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
            )}
          </div>

          {/* Controls section */}
          <div className="interactive-game__controls">
            <div className="interactive-game__score-actions">
              <ScoreDisplay
                score={scoreBreakdown}
                className="interactive-game__score"
              />
              
              <ActionIndicators
                actions={actionState}
                className="interactive-game__actions"
              />
              
              <SubmitButton
                isValid={isValidSubmit}
                onClick={handleSubmit}
                disabled={!isPlayerTurn || isProcessingMove}
                className="interactive-game__submit"
              />
            </div>
            
            {isPlayerTurn && (
              <div className="interactive-game__player-actions">
                <button
                  className="interactive-game__pass-btn"
                  onClick={handlePassTurn}
                  disabled={isProcessingMove}
                  type="button"
                >
                  Pass Turn
                </button>
              </div>
            )}
          </div>

          {/* Alphabet grid */}
          <div className="interactive-game__grid">
            <AlphabetGrid
              letterStates={letterStates}
              onLetterClick={handleLetterClick}
              onActionClick={handleActionClick}
              disabled={!isPlayerTurn || isProcessingMove}
              enableDrag={false} // Disable drag for this version
            />
          </div>
        </div>
      )}

      {/* Debug info */}
      {showDebugInfo && isGameActive && (
        <div className="interactive-game__debug">
          <h4>Debug Info</h4>
          <pre>{JSON.stringify({ 
            gameStats, 
            wordState,
            pendingWord,
            pendingMoveAttempt: pendingMoveAttempt?.isValid,
            isPlayerTurn,
            isBotTurn,
            isBotThinking
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}; 