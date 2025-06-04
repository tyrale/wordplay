import React from 'react';
import { GridCell } from '../ui/GridCell';
import type { GridCellState } from '../ui/GridCell';
import './AlphabetGrid.css';

export interface LetterState {
  letter: string;
  state: GridCellState;
}

export interface AlphabetGridProps {
  letterStates?: LetterState[];
  onLetterClick?: (letter: string) => void;
  onActionClick?: (action: string) => void;
  disabled?: boolean;
}

// Default alphabet layout
const ALPHABET_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['←', '↶', 'Y', 'Z', '?', '≡']
];

// Special action buttons in bottom row
const ACTION_BUTTONS = ['←', '↶', '?', '≡'];

export const AlphabetGrid: React.FC<AlphabetGridProps> = ({
  letterStates = [],
  onLetterClick,
  onActionClick,
  disabled = false
}) => {
  // Create a map for quick lookup of letter states
  const stateMap = letterStates.reduce((acc, { letter, state }) => {
    acc[letter] = state;
    return acc;
  }, {} as Record<string, GridCellState>);

  const handleCellClick = (content: string) => {
    if (disabled) return;
    
    if (ACTION_BUTTONS.includes(content)) {
      onActionClick?.(content);
    } else {
      onLetterClick?.(content);
    }
  };

  const getAriaLabel = (content: string): string => {
    if (ACTION_BUTTONS.includes(content)) {
      switch (content) {
        case '←': return 'Return to home screen';
        case '↶': return 'Undo changes';
        case '?': return 'Help';
        case '≡': return 'Settings menu';
        default: return content;
      }
    }
    return `Letter ${content}`;
  };

  return (
    <div className="alphabet-grid" role="grid" aria-label="Alphabet grid">
      {ALPHABET_GRID.map((row, rowIndex) => (
        <div key={rowIndex} className="alphabet-grid__row" role="row">
          {row.map((content) => {
            const isAction = ACTION_BUTTONS.includes(content);
            const state = stateMap[content] || 'normal';
            
            return (
              <GridCell
                key={content}
                content={content}
                state={state}
                type={isAction ? 'action' : 'letter'}
                onClick={() => handleCellClick(content)}
                disabled={disabled}
                aria-label={getAriaLabel(content)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}; 