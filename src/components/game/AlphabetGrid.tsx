import React, { useCallback } from 'react';
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
  onLetterDragStart?: (letter: string) => void;
  onLetterDragEnd?: () => void;
  disabled?: boolean;
  enableDrag?: boolean;
}

// Default alphabet layout
const ALPHABET_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['←', '↻', 'Y', 'Z', '?', '≡']
];

// Special action buttons in bottom row
const ACTION_BUTTONS = ['←', '↻', '?', '≡'];

export const AlphabetGrid: React.FC<AlphabetGridProps> = ({
  letterStates = [],
  onLetterClick,
  onActionClick,
  onLetterDragStart,
  onLetterDragEnd,
  disabled = false,
  enableDrag = true
}) => {
  // Create a map for quick lookup of letter states
  const stateMap = letterStates.reduce((acc, { letter, state }) => {
    acc[letter] = state;
    return acc;
  }, {} as Record<string, GridCellState>);

  const handleCellClick = useCallback((content: string) => {
    if (disabled) return;
    
    if (ACTION_BUTTONS.includes(content)) {
      onActionClick?.(content);
    } else {
      onLetterClick?.(content);
    }
  }, [disabled, onActionClick, onLetterClick]);

  const handleDragStart = useCallback((e: React.DragEvent, content: string) => {
    if (disabled || ACTION_BUTTONS.includes(content)) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('text/plain', content);
    e.dataTransfer.setData('application/x-letter-source', 'alphabet-grid');
    e.dataTransfer.effectAllowed = 'copy';
    
    onLetterDragStart?.(content);
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.7';
  }, [disabled, onLetterDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Reset visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    
    onLetterDragEnd?.();
  }, [onLetterDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent, content: string) => {
    if (disabled || ACTION_BUTTONS.includes(content)) {
      return;
    }
    
    // Trigger drag start with mouse events
    onLetterDragStart?.(content);
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.7';
  }, [disabled, onLetterDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent, content: string) => {
    if (disabled || ACTION_BUTTONS.includes(content)) {
      return;
    }
    
    // Trigger drag start with touch events
    onLetterDragStart?.(content);
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.7';
  }, [disabled, onLetterDragStart]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    // Reset visual feedback for all letters, but only if not in tutorial mode
    const letters = document.querySelectorAll('.grid-cell--letter');
    letters.forEach(letter => {
      const element = letter as HTMLElement;
      // Only reset opacity if not constrained by tutorial CSS
      if (!element.closest('.tutorial-overlay__game:not(.tutorial-overlay__game--complete)')) {
        element.style.opacity = '1';
      } else {
        // In tutorial mode, remove inline style to let CSS take over
        element.style.opacity = '';
      }
    });
    
    onLetterDragEnd?.();
  }, [onLetterDragEnd]);

  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    // Reset visual feedback for all letters, but only if not in tutorial mode
    const letters = document.querySelectorAll('.grid-cell--letter');
    letters.forEach(letter => {
      const element = letter as HTMLElement;
      // Only reset opacity if not constrained by tutorial CSS
      if (!element.closest('.tutorial-overlay__game:not(.tutorial-overlay__game--complete)')) {
        element.style.opacity = '1';
      } else {
        // In tutorial mode, remove inline style to let CSS take over
        element.style.opacity = '';
      }
    });
    
    onLetterDragEnd?.();
  }, [onLetterDragEnd]);



  const getAriaLabel = (content: string): string => {
    if (ACTION_BUTTONS.includes(content)) {
      switch (content) {
        case '←': return 'Return to home screen';
        case '↻': return 'Reset word';
        case '?': return 'Help';
        case '≡': return 'Settings menu';
        default: return content;
      }
    }
    return `Letter ${content}`;
  };

  const getDragAriaLabel = (content: string, state: GridCellState): string => {
    const baseLabel = getAriaLabel(content);
    if (ACTION_BUTTONS.includes(content)) {
      return baseLabel;
    }
    
    if (state === 'key') {
      return `${baseLabel} (key letter, draggable)`;
    } else if (state === 'locked') {
      return `${baseLabel} (locked)`;
    } else if (state === 'lockedKey') {
      return `${baseLabel} (locked key letter, cannot be removed)`;
    } else if (state === 'disabled') {
      return `${baseLabel} (disabled)`;
    }
    
    return `${baseLabel} (draggable)`;
  };

  return (
    <div 
      className="alphabet-grid" 
      role="grid" 
      aria-label="Alphabet grid"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {ALPHABET_GRID.map((row, rowIndex) => (
        <div key={rowIndex} className="alphabet-grid__row" role="row">
          {row.map((content) => {
            const isAction = ACTION_BUTTONS.includes(content);
            const state = stateMap[content] || 'normal';
            const canDrag = enableDrag && !disabled && !isAction && state !== 'disabled';
            
            // Menu button - no special handling needed since close icon is now in menu
            if (content === '≡') {
              return (
                <GridCell
                  key={content}
                  content={content}
                  state={state}
                  type="action"
                  onClick={() => handleCellClick(content)}
                  disabled={disabled}
                  aria-label={getDragAriaLabel(content, state)}
                />
              );
            }
            
            return (
              <GridCell
                key={content}
                content={content}
                state={state}
                type={isAction ? 'action' : 'letter'}
                onClick={() => handleCellClick(content)}
                onDragStart={canDrag ? (e) => handleDragStart(e, content) : undefined}
                onDragEnd={canDrag ? handleDragEnd : undefined}
                onMouseDown={canDrag ? (e) => handleMouseDown(e, content) : undefined}
                onTouchStart={canDrag ? (e) => handleTouchStart(e, content) : undefined}
                draggable={canDrag}
                disabled={disabled}
                aria-label={getDragAriaLabel(content, state)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}; 