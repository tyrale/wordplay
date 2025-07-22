import React, { useEffect, useRef } from 'react';
import './WordTrail.css';

export interface WordMove {
  word: string;
  score: number;
  player?: string;
  opponentName?: string; // Display name for the opponent (e.g., "basicBot", "easy bot")
  turnNumber?: number;
  actions?: string[];
  keyLetters?: string[];
  scoreBreakdown?: {
    addLetterPoints: number;
    removeLetterPoints: number;
    movePoints: number;
    keyLetterUsagePoints: number;
  };
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
        opponentName: move.opponentName,
        turnNumber: move.turnNumber || index + 1,
        actions: move.actions || [],
        keyLetters: move.keyLetters || [],
        scoreBreakdown: move.scoreBreakdown
      }))
    : words.map((word, index) => ({
        word,
        score: 0,
        player: undefined,
        opponentName: undefined,
        turnNumber: index + 1,
        actions: [],
        keyLetters: [],
        scoreBreakdown: undefined
      }));

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

  // Render a word with start word positioned inside the first letter
  const renderWordWithStartWord = (word: string, keyLetters: string[], startWord: string) => {
    const letters = word.toUpperCase().split('');
    
    return (
      <span className="word-trail__word-container">
        {letters.map((letter, index) => {
          const isKeyLetter = keyLetters.includes(letter);
          const isFirstLetter = index === 0;
          return (
            <span
              key={index}
              className={`word-trail__letter ${isKeyLetter ? 'word-trail__letter--key' : ''} ${isFirstLetter ? 'word-trail__letter--first' : ''}`}
            >
              {isFirstLetter && (
                <div className="word-trail__start-word">
                  <span className="word-trail__word word-trail__word--start">
                    {renderWordWithHighlights(startWord, [])}
                  </span>
                  <span className="word-trail__arrow word-trail__arrow--right">→</span>
                </div>
              )}
              {letter}
            </span>
          );
        })}
      </span>
    );
  };

  // Render a word with target word positioned inside the last letter
  const renderWordWithTargetWord = (word: string, keyLetters: string[], targetWord: string) => {
    const letters = word.toUpperCase().split('');
    
    return (
      <span className="word-trail__word-container">
        {letters.map((letter, index) => {
          const isKeyLetter = keyLetters.includes(letter);
          const isLastLetter = index === letters.length - 1;
          return (
            <span
              key={index}
              className={`word-trail__letter ${isKeyLetter ? 'word-trail__letter--key' : ''} ${isLastLetter ? 'word-trail__letter--last' : ''}`}
            >
              {letter}
              {isLastLetter && (
                <div className="word-trail__target-word">
                  <span className="word-trail__arrow word-trail__arrow--left">←</span>
                  <span className="word-trail__word word-trail__word--target">
                    {renderWordWithHighlights(targetWord, [])}
                  </span>
                </div>
              )}
            </span>
          );
        })}
      </span>
    );
  };

  // Challenge mode uses new layout with positioned start/target words
  // Handle challenge mode BEFORE early return to allow empty state rendering
  if (isChallengeMode && startWord && targetWord) {
    // Filter out start and target words from played moves
    const playedMoves = displayData.filter(item => 
      item.player !== 'start' && item.player !== 'target'
    );

    const hasPlayedWords = playedMoves.length > 0;
    const playedWordsRef = useRef<HTMLDivElement>(null);
    const challengeContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top to show newest words (with column-reverse, newest at bottom)
    useEffect(() => {
      if (playedWordsRef.current && hasPlayedWords) {
        const container = playedWordsRef.current;
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
          // With column-reverse, scroll to top (0) to show newest words at bottom
          container.scrollTop = 0;
        });
      }
    }, [playedMoves.length, hasPlayedWords]);

    // Reverse data order for column-reverse layout (newest items appear at bottom)
    const reversedPlayedMoves = [...playedMoves].reverse();

          return (
        <div className={`word-trail word-trail--challenge ${className}`.trim()} role="region" aria-label="Challenge word trail">
          <div className="word-trail__challenge-container" ref={challengeContainerRef}>
            {/* Played words trail with absolutely positioned start/target words */}
            <div className="word-trail__played-words" ref={playedWordsRef}>
              {hasPlayedWords ? (
                <div className="word-trail__container">
                  {reversedPlayedMoves.map((item, index) => {
                    const isFirstWord = index === reversedPlayedMoves.length - 1;
                    const isLastWord = index === 0;
                    
                    return (
                      <div 
                        key={`${item.word}-${item.turnNumber}-${index}`}
                        className={[
                          'word-trail__line',
                          onWordClick && 'word-trail__line--clickable',
                          item.player && `word-trail__line--player-${item.player}`,
                          isFirstWord && 'word-trail__line--first',
                          isLastWord && 'word-trail__line--last'
                        ].filter(Boolean).join(' ')}
                        role="listitem"
                      >
                        {/* Opponent name on the left side for bot moves */}
                        {item.player === 'bot' && item.opponentName && (
                          <span className="word-trail__opponent-name">
                            {item.opponentName}
                          </span>
                        )}
                        
                        <span 
                          className="word-trail__word"
                          onClick={onWordClick ? () => handleWordClick(item.word, index) : undefined}
                          role={onWordClick ? 'button' : undefined}
                          tabIndex={onWordClick ? 0 : undefined}
                          aria-label={`Word: ${item.word}${showScores ? `, ${item.score} points` : ''}`}
                        >
                          {isFirstWord 
                            ? renderWordWithStartWord(item.word, item.keyLetters, startWord)
                            : isLastWord
                            ? renderWordWithTargetWord(item.word, item.keyLetters, targetWord)
                            : renderWordWithHighlights(item.word, item.keyLetters)
                          }
                        </span>
                        
                        {showScores && (item.score > 0 || (item.score === 0 && item.actions.includes('PASS'))) && (
                          <span className="word-trail__score" aria-label={item.score === 0 && item.actions.includes('PASS') ? 'passed turn' : `${item.score} points`}>
                            {item.score === 0 && item.actions.includes('PASS') ? 'pass' : 
                              item.scoreBreakdown ? 
                                (() => {
                                  const base = item.scoreBreakdown.addLetterPoints + item.scoreBreakdown.removeLetterPoints + item.scoreBreakdown.movePoints;
                                  const keyBonus = item.scoreBreakdown.keyLetterUsagePoints;
                                  if (base > 0) {
                                    return keyBonus > 0 ? `+${base} +${keyBonus}` : `+${base}`;
                                  } else if (keyBonus > 0) {
                                    return `+${keyBonus}`;
                                  }
                                  return '+0';
                                })() : 
                                `+${item.score}`
                            }
                          </span>
                        )}
                      </div>
                    );
                  })}
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

  // Early return for regular mode when no data
  console.log('[DEBUG] WordTrail: displayData.length:', displayData.length);
  console.log('[DEBUG] WordTrail: displayData:', displayData);
  
  if (displayData.length === 0) {
    console.log('[DEBUG] WordTrail: Returning null - no data');
    return null;
  }

  // Regular mode - with auto-scroll support
  const regularContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top to show newest words (with column-reverse, newest at bottom)
  useEffect(() => {
    if (regularContainerRef.current && displayData.length > 0) {
      const container = regularContainerRef.current;
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        // With column-reverse, scroll to top (0) to show newest words at bottom
        container.scrollTop = 0;
      });
    }
  }, [displayData.length]);

  // Reverse data order for column-reverse layout (newest items appear at bottom)
  const reversedDisplayData = [...displayData].reverse();

  return (
    <div className={`word-trail ${className}`.trim()} role="region" aria-label="Game word history">
      <div className="word-trail__container" ref={regularContainerRef}>
        {reversedDisplayData.map((item, index) => (
          <div 
            key={`${item.word}-${item.turnNumber}-${index}`}
            className={[
              'word-trail__line',
              onWordClick && 'word-trail__line--clickable',
              item.player && `word-trail__line--player-${item.player}`
            ].filter(Boolean).join(' ')}
            role="listitem"
          >
            {/* Opponent name on the left side for bot moves */}
            {item.player === 'bot' && item.opponentName && (
              <span className="word-trail__opponent-name">
                {item.opponentName}
              </span>
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
                {item.score === 0 && item.actions.includes('PASS') ? 'pass' : 
                  item.scoreBreakdown ? 
                    (() => {
                      const base = item.scoreBreakdown.addLetterPoints + item.scoreBreakdown.removeLetterPoints + item.scoreBreakdown.movePoints;
                      const keyBonus = item.scoreBreakdown.keyLetterUsagePoints;
                      if (base > 0) {
                        return keyBonus > 0 ? `+${base} +${keyBonus}` : `+${base}`;
                      } else if (keyBonus > 0) {
                        return `+${keyBonus}`;
                      }
                      return '+0';
                    })() : 
                    `+${item.score}`
                }
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 