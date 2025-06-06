import React from 'react';
import './WordTrail.css';

export interface WordMove {
  word: string;
  score: number;
  player?: string;
  turnNumber?: number;
  actions?: string[];
}

export interface WordTrailProps {
  words?: string[];
  moves?: WordMove[];
  showScores?: boolean;
  showTurnNumbers?: boolean;
  maxVisible?: number;
  onWordClick?: (word: string, index: number) => void;
  className?: string;
}

export const WordTrail: React.FC<WordTrailProps> = ({ 
  words = [],
  moves = [],
  showScores = false,
  showTurnNumbers = false,
  maxVisible = 10,
  onWordClick,
  className = '' 
}) => {
  // Unused parameters to avoid TS warnings
  void showTurnNumbers;
  void maxVisible;
  // Use moves if available, otherwise fall back to simple words
  const displayData = moves.length > 0 
    ? moves.map((move, index) => ({
        word: move.word,
        score: move.score,
        player: move.player,
        turnNumber: move.turnNumber || index + 1,
        actions: move.actions || []
      }))
    : words.map((word, index) => ({
        word,
        score: 0,
        player: undefined,
        turnNumber: index + 1,
        actions: []
      }));

  if (displayData.length === 0) {
    return null;
  }

  const handleWordClick = (word: string, index: number) => {
    if (onWordClick) {
      onWordClick(word, index);
    }
  };

  return (
    <div className={`word-trail ${className}`.trim()} role="region" aria-label="Game word history">
      <div className="word-trail__container">
        {displayData.map((item, index) => (
          <div 
            key={`${item.word}-${item.turnNumber}-${index}`}
            className={[
              'word-trail__line',
              onWordClick && 'word-trail__line--clickable',
              item.player && `word-trail__line--player-${item.player}`
            ].filter(Boolean).join(' ')}
            role="listitem"
          >
            <span 
              className="word-trail__word"
              onClick={onWordClick ? () => handleWordClick(item.word, index) : undefined}
              role={onWordClick ? 'button' : undefined}
              tabIndex={onWordClick ? 0 : undefined}
              aria-label={`Word: ${item.word}${showScores ? `, ${item.score} points` : ''}`}
            >
              {item.word.toUpperCase()}
            </span>
            
            {showScores && item.score > 0 && (
              <span className="word-trail__score" aria-label={`${item.score} points`}>
                +{item.score}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 