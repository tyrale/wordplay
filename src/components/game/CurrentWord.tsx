import React from 'react';
import './CurrentWord.css';
import { LockIcon } from '../ui/LockIcon';

export interface LetterHighlight {
  index: number;
  type: 'key' | 'locked' | 'lockedKey';
}

export interface CurrentWordProps {
  word: string;
  highlights?: LetterHighlight[];
  className?: string;
}

export const CurrentWord: React.FC<CurrentWordProps> = ({ 
  word, 
  highlights = [], 
  className = '' 
}) => {
  const letters = word.toUpperCase().split('');
  
  // Create a map for quick lookup of highlights
  const highlightMap = highlights.reduce((acc, { index, type }) => {
    acc[index] = type;
    return acc;
  }, {} as Record<number, 'key' | 'locked' | 'lockedKey'>);

  return (
    <div className={`current-word ${className}`.trim()} role="status" aria-label={`Current word: ${word}`}>
      {letters.map((letter, index) => {
        const highlightType = highlightMap[index];
        
        return (
          <span
            key={index}
            className={`current-word__letter ${
              highlightType ? `current-word__letter--${highlightType}` : ''
            }`.trim()}
            aria-label={
              highlightType 
                ? `${letter} ${highlightType} letter` 
                : letter
            }
          >
            {letter}
                    {(highlightType === 'locked' || highlightType === 'lockedKey') && (
          <span className="current-word__lock" aria-hidden="true">
            <LockIcon size={10} />
          </span>
        )}
          </span>
        );
      })}
    </div>
  );
}; 