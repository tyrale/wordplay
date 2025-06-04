import React from 'react';
import { WordTrail } from './WordTrail';
import { CurrentWord } from './CurrentWord';
import { ActionIndicators } from './ActionIndicators';
import { SubmitButton } from './SubmitButton';
import { ScoreDisplay } from './ScoreDisplay';
import { AlphabetGrid } from './AlphabetGrid';
import type { LetterHighlight } from './CurrentWord';
import type { ActionState } from './ActionIndicators';
import type { ScoreBreakdown } from './ScoreDisplay';
import type { LetterState } from './AlphabetGrid';
import './GameBoard.css';

export interface GameBoardProps {
  // Word state
  wordTrail: string[];
  currentWord: string;
  wordHighlights?: LetterHighlight[];
  
  // Actions and scoring
  actions: ActionState;
  score: ScoreBreakdown;
  isValidWord: boolean;
  
  // Grid state
  letterStates: LetterState[];
  
  // Event handlers
  onLetterClick?: (letter: string) => void;
  onActionClick?: (action: string) => void;
  onSubmit?: () => void;
  
  // State
  disabled?: boolean;
  className?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  wordTrail,
  currentWord,
  wordHighlights,
  actions,
  score,
  isValidWord,
  letterStates,
  onLetterClick,
  onActionClick,
  onSubmit,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`game-board ${className}`.trim()}>
      {/* Header: Word Trail */}
      <div className="game-board__header">
        <WordTrail words={wordTrail} />
      </div>

      {/* Current Word Display */}
      <div className="game-board__word">
        <CurrentWord word={currentWord} highlights={wordHighlights} />
      </div>

      {/* Action Controls - Centered Layout */}
      <div className="game-board__controls">
        <div className="game-board__controls-content">
          <ScoreDisplay score={score} />
          <ActionIndicators actions={actions} />
          <SubmitButton 
            isValid={isValidWord} 
            onClick={onSubmit} 
            disabled={disabled}
          />
        </div>
      </div>

      {/* Alphabet Grid */}
      <div className="game-board__grid">
        <AlphabetGrid
          letterStates={letterStates}
          onLetterClick={onLetterClick}
          onActionClick={onActionClick}
          disabled={disabled}
        />
      </div>
    </div>
  );
}; 