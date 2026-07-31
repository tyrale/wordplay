/**
 * Word Path Explorer
 *
 * Simple, text-only interface for a player to navigate their local word
 * path graph (every word they've ever seen, connected by moves that
 * actually changed the word). Two modes:
 *
 *  - "typing": the player builds a word letter-by-letter with the same
 *    alphabet grid used in-game. As soon as a word they've seen is typed,
 *    its connected words are listed below it.
 *  - "browsing": after tapping a connected word from the list, that word
 *    becomes the active word (its own connections are listed below it in
 *    turn). An X below the active word clears it and returns to typing mode.
 */

import React, { useState, useCallback } from 'react';
import { AlphabetGrid } from '../game/AlphabetGrid';
import { WordBuilder } from '../game/WordBuilder';
import { CurrentWord } from '../game/CurrentWord';
import { useWordPathGraph } from '../../hooks/useWordPathGraph';
import { triggerHapticFeedback } from '../../utils/haptics';
import { triggerSoundFeedback } from '../../utils/sound';
import './WordPathExplorer.css';

export interface WordPathExplorerProps {
  isVisible: boolean;
  onClose: () => void;
}

const MAX_WORD_LENGTH = 10;

export const WordPathExplorer: React.FC<WordPathExplorerProps> = ({ isVisible, onClose }) => {
  const { hasSeenWord, getConnectedWords } = useWordPathGraph();
  const [word, setWord] = useState('');
  const [mode, setMode] = useState<'typing' | 'browsing'>('typing');

  const handleLetterClick = useCallback((letter: string) => {
    setWord(prev => (prev.length < MAX_WORD_LENGTH ? prev + letter : prev));
    triggerHapticFeedback('add');
    triggerSoundFeedback('add');
  }, []);

  const handleLetterRemove = useCallback((info: { index: number }) => {
    setWord(prev => {
      const letters = prev.split('');
      letters.splice(info.index, 1);
      return letters.join('');
    });
    triggerHapticFeedback('remove');
    triggerSoundFeedback('remove');
  }, []);

  const handleSelectConnectedWord = useCallback((connectedWord: string) => {
    setWord(connectedWord);
    setMode('browsing');
    triggerHapticFeedback('submit');
    triggerSoundFeedback('submit');
  }, []);

  const handleClearActiveWord = useCallback(() => {
    setWord('');
    setMode('typing');
    triggerHapticFeedback('remove');
    triggerSoundFeedback('remove');
  }, []);

  const handleFullClose = useCallback(() => {
    setWord('');
    setMode('typing');
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const trimmedWord = word.trim();
  const seen = trimmedWord.length > 0 && hasSeenWord(trimmedWord);
  const connectedWords = seen ? getConnectedWords(trimmedWord) : [];

  return (
    <div
      className="word-path-explorer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-path-explorer-title"
    >
      <div className="word-path-explorer__content">
        <h2 id="word-path-explorer-title" className="word-path-explorer__title">
          word paths
        </h2>

        <div className="word-path-explorer__word-display">
          {mode === 'browsing' ? (
            <CurrentWord word={word} />
          ) : (
            <WordBuilder
              currentWord={word}
              onLetterClick={handleLetterRemove}
            />
          )}
        </div>

        {mode === 'browsing' && (
          <button
            className="word-path-explorer__clear-active"
            onClick={handleClearActiveWord}
            aria-label="Clear active word"
          >
            ×
          </button>
        )}

        <div className="word-path-explorer__results">
          {trimmedWord.length === 0 ? (
            <p className="word-path-explorer__hint">type a word to see its path</p>
          ) : !seen ? (
            <p className="word-path-explorer__hint">you haven't seen this yet</p>
          ) : connectedWords.length === 0 ? (
            <p className="word-path-explorer__hint">no connections yet</p>
          ) : (
            <ul className="word-path-explorer__connections">
              {connectedWords.map(connectedWord => (
                <li key={connectedWord}>
                  <button
                    className="word-path-explorer__connection"
                    onClick={() => handleSelectConnectedWord(connectedWord)}
                  >
                    {connectedWord}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {mode === 'typing' && (
          <div className="word-path-explorer__grid">
            <AlphabetGrid
              letterStates={[]}
              onLetterClick={handleLetterClick}
              onActionClick={() => {}}
              enableDrag={false}
            />
          </div>
        )}
      </div>

      <button
        className="word-path-explorer__close"
        onClick={handleFullClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
