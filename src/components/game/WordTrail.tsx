import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const visibleData = isExpanded ? displayData : displayData.slice(-maxVisible);
  const hasHiddenItems = displayData.length > maxVisible;

  const handleWordClick = (word: string, index: number) => {
    if (onWordClick) {
      onWordClick(word, index);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`word-trail ${className}`.trim()} role="region" aria-label="Game word history">
      {hasHiddenItems && !isExpanded && (
        <button 
          className="word-trail__expand-btn"
          onClick={toggleExpanded}
          aria-label={`Show ${displayData.length - maxVisible} earlier words`}
          type="button"
        >
          +{displayData.length - maxVisible} more
        </button>
      )}
      
      <div className="word-trail__list" role="list">
        {visibleData.map((item, index) => (
          <div 
            key={`${item.word}-${item.turnNumber}-${index}`}
            className={[
              'word-trail__item',
              onWordClick && 'word-trail__item--clickable',
              item.player && `word-trail__item--player-${item.player}`
            ].filter(Boolean).join(' ')}
            role="listitem"
          >
            {index > 0 && <span className="word-trail__separator" aria-hidden="true">•</span>}
            
            <div className="word-trail__word-container">
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
              
              {showTurnNumbers && (
                <span className="word-trail__turn" aria-label={`Turn ${item.turnNumber}`}>
                  T{item.turnNumber}
                </span>
              )}
              
              {item.actions && item.actions.length > 0 && (
                <div className="word-trail__actions" aria-label="Move actions">
                  {item.actions.map((action, actionIndex) => (
                    <span 
                      key={actionIndex} 
                      className="word-trail__action"
                      aria-hidden="true"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {hasHiddenItems && isExpanded && (
        <button 
          className="word-trail__collapse-btn"
          onClick={toggleExpanded}
          aria-label="Show fewer words"
          type="button"
        >
          Show less
        </button>
      )}
      
      <div className="word-trail__stats" role="status" aria-live="polite">
        <span className="word-trail__count">
          {displayData.length} word{displayData.length !== 1 ? 's' : ''}
        </span>
        {showScores && (
          <span className="word-trail__total-score">
            Total: {displayData.reduce((sum, item) => sum + item.score, 0)} points
          </span>
        )}
      </div>
    </div>
  );
}; 