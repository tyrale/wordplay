import React, { useEffect, useRef } from 'react';
import './WordTrail.css';

export interface WordMove {
  word: string;
  score: number;
  player?: string;
  turnNumber?: number;
  actions?: string[];
  keyLetters?: string[];
}

export interface WordTrailProps {
  words?: string[];
  moves?: WordMove[];
  showScores?: boolean;
  showTurnNumbers?: boolean;
  maxVisible?: number;
  onWordClick?: (word: string, index: number) => void;
  className?: string;
  // New props for challenge mode layout
  startWord?: string;
  targetWord?: string;
  isChallengeMode?: boolean;
}

export const WordTrail: React.FC<WordTrailProps> = ({ 
  words = [],
  moves = [],
  showScores = false,
  showTurnNumbers = false,
  maxVisible = 10,
  onWordClick,
  className = '',
  startWord,
  targetWord,
  isChallengeMode = false
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
        actions: move.actions || [],
        keyLetters: move.keyLetters || []
      }))
    : words.map((word, index) => ({
        word,
        score: 0,
        player: undefined,
        turnNumber: index + 1,
        actions: [],
        keyLetters: []
      }));

  if (displayData.length === 0) {
    return null;
  }

  const handleWordClick = (word: string, index: number) => {
    if (onWordClick) {
      onWordClick(word, index);
    }
  };

  // Render a word with key letter highlighting
  const renderWordWithHighlights = (word: string, keyLetters: string[]) => {
    const letters = word.toUpperCase().split('');
    
    return (
      <span className="word-trail__word-container">
        {letters.map((letter, index) => {
          const isKeyLetter = keyLetters.includes(letter);
          return (
            <span
              key={index}
              className={`word-trail__letter ${isKeyLetter ? 'word-trail__letter--key' : ''}`}
            >
              {letter}
            </span>
          );
        })}
      </span>
    );
  };

  // Challenge mode uses new layout with positioned start/target words
  if (isChallengeMode && startWord && targetWord) {
    // Filter out start and target words from played moves
    const playedMoves = displayData.filter(item => 
      item.player !== 'start' && item.player !== 'target'
    );

    const hasPlayedWords = playedMoves.length > 0;
    const playedWordsRef = useRef<HTMLDivElement>(null);
    const challengeContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new words are added
    useEffect(() => {
      if (playedWordsRef.current && hasPlayedWords) {
        const container = playedWordsRef.current;
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    }, [playedMoves.length, hasPlayedWords]);

          return (
        <div className={`word-trail word-trail--challenge ${className}`.trim()} role="region" aria-label="Challenge word trail">
          <div className="word-trail__challenge-container" ref={challengeContainerRef}>
            {/* Played words trail with absolutely positioned start/target words */}
            <div className="word-trail__played-words" ref={playedWordsRef}>
              {hasPlayedWords ? (
                <div className="word-trail__container">
                  {playedMoves.map((item, index) => (
                    <div 
                      key={`${item.word}-${item.turnNumber}-${index}`}
                      className={[
                        'word-trail__line',
                        onWordClick && 'word-trail__line--clickable',
                        item.player && `word-trail__line--player-${item.player}`,
                        index === 0 && 'word-trail__line--first',
                        index === playedMoves.length - 1 && 'word-trail__line--last'
                      ].filter(Boolean).join(' ')}
                      role="listitem"
                    >
                      {/* Start word positioned absolutely on first word line */}
                      {index === 0 && (
                        <div className="word-trail__start-word">
                          <span className="word-trail__word word-trail__word--start">
                            {renderWordWithHighlights(startWord, [])}
                          </span>
                          <span className="word-trail__arrow word-trail__arrow--right">→</span>
                        </div>
                      )}

                      <span 
                        className="word-trail__word"
                        onClick={onWordClick ? () => handleWordClick(item.word, index) : undefined}
                        role={onWordClick ? 'button' : undefined}
                        tabIndex={onWordClick ? 0 : undefined}
                        aria-label={`Word: ${item.word}${showScores ? `, ${item.score} points` : ''}`}
                      >
                        {renderWordWithHighlights(item.word, item.keyLetters)}
                      </span>
                      
                      {showScores && (item.score > 0 || (item.score === 0 && item.actions.includes('PASS'))) && (
                        <span className="word-trail__score" aria-label={item.score === 0 && item.actions.includes('PASS') ? 'passed turn' : `${item.score} points`}>
                          {item.score === 0 && item.actions.includes('PASS') ? 'pass' : `+${item.score}`}
                        </span>
                      )}

                      {/* Target word positioned absolutely on last word line */}
                      {index === playedMoves.length - 1 && (
                        <div className="word-trail__target-word">
                          <span className="word-trail__arrow word-trail__arrow--left">←</span>
                          <span className="word-trail__word word-trail__word--target">
                            {renderWordWithHighlights(targetWord, [])}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Empty state - start and target words centered
                <div className="word-trail__empty-space">
                  <div className="word-trail__start-word--empty">
                    <span className="word-trail__word word-trail__word--start">
                      {renderWordWithHighlights(startWord, [])}
                    </span>
                    <span className="word-trail__arrow word-trail__arrow--right">→</span>
                  </div>
                  <div className="word-trail__target-word--empty">
                    <span className="word-trail__arrow word-trail__arrow--left">←</span>
                    <span className="word-trail__word word-trail__word--target">
                      {renderWordWithHighlights(targetWord, [])}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
  }

  // Regular mode - original layout
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
              {renderWordWithHighlights(item.word, item.keyLetters)}
            </span>
            
            {showScores && (item.score > 0 || (item.score === 0 && item.actions.includes('PASS'))) && (
              <span className="word-trail__score" aria-label={item.score === 0 && item.actions.includes('PASS') ? 'passed turn' : `${item.score} points`}>
                {item.score === 0 && item.actions.includes('PASS') ? 'pass' : `+${item.score}`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 