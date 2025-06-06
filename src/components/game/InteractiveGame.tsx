import React, { useState, useEffect, useCallback } from 'react';
import { useGameState, useGameStats, useWordState } from '../../hooks/useGameState';
import { AlphabetGrid } from './AlphabetGrid';
import { WordTrail } from './WordTrail';



import { ScoreDisplay } from './ScoreDisplay';
import { WordBuilder } from './WordBuilder';
import { DebugDialog } from './DebugDialog';

import { type GameConfig, type MoveAttempt, isValidDictionaryWord } from '../../utils/engineExports';
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
  console.log('🎨 InteractiveGame RENDER - timestamp:', Date.now());
  
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
    console.log('📱 pendingWord STATE CHANGE:', {
      newValue: pendingWord,
      length: pendingWord.length,
      timestamp: Date.now()
    });
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
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isBotTurn, isGameActive, isBotThinking, actions, gameState.players]);

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
      add: actions.some(action => action.startsWith('Added letter')),
      remove: actions.some(action => action.startsWith('Removed letter')),
      move: actions.some(action => action === 'Rearranged letters')
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
      actions: turn.scoringBreakdown.actions
    }));
    
    // If in pass mode, add PASSED as the latest move
    if (isPassMode) {
      const passMove = {
        word: 'PASSED',
        score: 0,
        player: gameState.players.find(p => p.isCurrentPlayer)?.id || 'human',
        turnNumber: gameState.currentTurn,
        actions: []
      };
      return [
        ...moves,
        passMove
      ];
    }
    
    // Return actual moves only - start with empty trail
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
    console.log('🔄 InteractiveGame handleWordChange called:', {
      newWord,
      oldWord: pendingWord,
      isPlayerTurn,
      isProcessingMove,
      timestamp: Date.now(),
      callStack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    if (!isPlayerTurn || isProcessingMove) {
      console.log('❌ InteractiveGame handleWordChange skipped - not player turn or processing');
      return;
    }
    
    console.log('✅ InteractiveGame updating word from', pendingWord, 'to', newWord);
    console.log('📊 Word change analysis:', {
      oldLength: pendingWord.length,
      newLength: newWord.length,
      lengthDiff: newWord.length - pendingWord.length,
      expectedDiff: -1,
      isCorrectChange: (newWord.length - pendingWord.length) === -1
    });
    
    setPendingWord(newWord);
    setIsPassMode(false); // Reset pass mode when word changes
    
    // Validate the move attempt
    console.log('🎯 Checking if should validate move:', {
      newWord,
      currentWord: wordState.currentWord,
      shouldValidate: newWord !== wordState.currentWord,
      gameState: gameState,
      fullWordState: wordState
    });
    
    if (newWord !== wordState.currentWord) {
      console.log('✅ Calling attemptMove for:', newWord);
      const attempt = actions.attemptMove(newWord);
      console.log('📊 AttemptMove result:', attempt);
      setPendingMoveAttempt(attempt);
    } else {
      console.log('❌ No validation - word same as current');
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
    console.log('🖱️ InteractiveGame handleWordBuilderMouseUp:', {
      draggedLetter,
      pendingWordLength: pendingWord.length,
      timestamp: Date.now()
    });
    
    if (draggedLetter && pendingWord.length < 10) {
      console.log('✅ InteractiveGame adding dragged letter to word');
      const newWord = pendingWord + draggedLetter;
      handleWordChange(newWord);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleWordBuilderTouchEnd = useCallback((_e: React.TouchEvent) => {
    console.log('👆 InteractiveGame handleWordBuilderTouchEnd:', {
      draggedLetter,
      pendingWordLength: pendingWord.length,
      timestamp: Date.now()
    });
    
    if (draggedLetter && pendingWord.length < 10) {
      console.log('✅ InteractiveGame adding dragged letter to word via touch');
      const newWord = pendingWord + draggedLetter;
      handleWordChange(newWord);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleLetterRemove = useCallback((index: number) => {
    console.log('🗑️ InteractiveGame handleLetterRemove called:', {
      index,
      isPlayerTurn,
      isProcessingMove,
      pendingWord,
      pendingWordLength: pendingWord.length,
      timestamp: Date.now(),
      callStack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    if (!isPlayerTurn || isProcessingMove) {
      console.log('❌ InteractiveGame handleLetterRemove skipped - not player turn or processing');
      return;
    }
    
    console.log('✂️ InteractiveGame removing letter at index', index, 'from word:', pendingWord);
    console.log('📝 BEFORE removal - letters array:', pendingWord.split('').map((letter, i) => `${i}:${letter}`));
    console.log('🎯 Target: removing letter at index', index, '=', pendingWord[index]);
    
    const letters = pendingWord.split('');
    const originalLength = letters.length;
    const targetLetter = letters[index];
    
    // Enhanced splice logging
    console.log('🔪 About to splice - array:', letters, 'index:', index, 'deleteCount: 1');
    const splicedElements = letters.splice(index, 1);
    console.log('✂️ Splice result - removed:', splicedElements, 'remaining array:', letters);
    console.log('📊 Length change:', originalLength, '→', letters.length, '(should be -1)');
    
    const newWord = letters.join('');
    console.log('🔄 Final result:', pendingWord, '→', newWord);
    console.log('📝 AFTER removal - letters array:', letters.map((letter, i) => `${i}:${letter}`));
    
    // Verify splice behavior
    if (splicedElements.length !== 1) {
      console.error('🚨 SPLICE ERROR: Expected to remove 1 element, actually removed:', splicedElements.length, splicedElements);
    }
    if (splicedElements[0] !== targetLetter) {
      console.error('🚨 TARGET ERROR: Expected to remove', targetLetter, 'actually removed:', splicedElements[0]);
    }
    
    console.log('🔄 InteractiveGame calling handleWordChange with new word:', newWord);
    handleWordChange(newWord);
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleSubmit = useCallback(() => {
    console.log('🚀 handleSubmit called:', {
      isPlayerTurn,
      isProcessingMove,
      canApply: pendingMoveAttempt?.canApply,
      isPassMode,
      pendingWord: pendingMoveAttempt?.newWord
    });
    
    if (!isPlayerTurn || isProcessingMove) return;
    
    // Handle pass mode - first click on invalid X activates pass mode
    if (!pendingMoveAttempt?.canApply && !isPassMode) {
      console.log('🚀 Activating pass mode');
      setIsPassMode(true);
      return;
    }
    
    // Handle second click in pass mode - actually pass the turn
    if (isPassMode) {
      console.log('🚀 Passing turn');
      actions.passTurn();
      setPendingWord(wordState.currentWord);
      setPendingMoveAttempt(null);
      setIsPassMode(false);
      return;
    }
    
    // Handle normal valid submission
    if (pendingMoveAttempt?.canApply) {
      console.log('🚀 Applying move:', pendingMoveAttempt.newWord);
      const success = actions.applyMove(pendingMoveAttempt);
      console.log('🚀 Move applied, success:', success);
      if (success) {
        setPendingWord(pendingMoveAttempt.newWord);
        setPendingMoveAttempt(null);
        setIsPassMode(false);
      }
    }
  }, [isPlayerTurn, isProcessingMove, pendingMoveAttempt, actions, isPassMode, wordState.currentWord]);



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