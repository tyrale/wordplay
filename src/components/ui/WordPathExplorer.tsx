/**
 * Word Path Explorer
 *
 * Simple, text-only interface for a player to navigate their local word
 * path graph (every word they've ever seen, connected by moves that
 * actually changed the word). Two modes:
 *
 *  - "typing": the player types a word with the device's own keyboard. As
 *    soon as a word they've seen is typed, its connected words are listed
 *    below it.
 *  - "browsing": after tapping a connected word from the list, that word
 *    becomes the active word (its own connections are listed below it in
 *    turn). An X below the active word clears it and returns to typing mode.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { WordBuilder } from '../game/WordBuilder';
import { useWordPathGraph } from '../../hooks/useWordPathGraph';
import { triggerHapticFeedback } from '../../utils/haptics';
import { triggerSoundFeedback } from '../../utils/sound';
import { calculateScore } from '../../../packages/engine/scoring';
import './WordPathExplorer.css';

/** Builds the +/-/~ action-icon string (add/remove/rearrange) for the move from `fromWord` to `toWord`, matching the icons shown during gameplay (see `ScoreDisplay`). */
function getActionIcons(fromWord: string, toWord: string): string {
  const { actions } = calculateScore(fromWord, toWord);
  const icons: string[] = [];
  if (actions.some(action => action.type === 'rearrange')) icons.push('~');
  if (actions.some(action => action.type === 'remove')) icons.push('-');
  if (actions.some(action => action.type === 'add')) icons.push('+');
  return icons.join(' ');
}

export interface WordPathExplorerProps {
  isVisible: boolean;
  onClose: () => void;
}

const MAX_WORD_LENGTH = 10;

export const WordPathExplorer: React.FC<WordPathExplorerProps> = ({ isVisible, onClose }) => {
  const { hasSeenWord, getConnectedWords } = useWordPathGraph();
  const [word, setWord] = useState('');
  const [mode, setMode] = useState<'typing' | 'browsing'>('typing');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && mode === 'typing') {
      inputRef.current?.focus();
    }
  }, [isVisible, mode]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, MAX_WORD_LENGTH);
    setWord(sanitized);
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
      aria-label="Word Path Explorer"
    >
      <div className="word-path-explorer__content">
        <div className="word-path-explorer__word-display">
          <WordBuilder currentWord={word} />

          {mode === 'typing' && (
            <input
              ref={inputRef}
              className="word-path-explorer__input"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={word}
              onChange={handleInputChange}
              aria-label="Type a word"
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
                    <span className="word-path-explorer__connection-icons">
                      {getActionIcons(trimmedWord, connectedWord)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
