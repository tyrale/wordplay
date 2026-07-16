/**
 * Dictionaries Overlay
 *
 * Simple full-screen informational overlay (same flat visual language as
 * `AlertOverlay`) listing every word list/dictionary the game validates
 * words against, with a short description of each.
 */

import React from 'react';
import './DictionariesOverlay.css';

export interface DictionariesOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

interface DictionaryEntry {
  name: string;
  description: string;
}

const DICTIONARIES: DictionaryEntry[] = [
  {
    name: 'ENABLE Word List',
    description: 'The core English dictionary — about 172,819 words.'
  },
  {
    name: 'Slang',
    description: 'Modern informal words and internet slang accepted in casual play.'
  },
  {
    name: 'Common Proper Nouns',
    description: 'Months, days of the week, and common first names.'
  },
  {
    name: 'Profanity List',
    description: 'Used to catch and mask bad words with the vanity filter.'
  }
];

export const DictionariesOverlay: React.FC<DictionariesOverlayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div
      className="dictionaries-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dictionaries-overlay-title"
    >
      <div className="dictionaries-overlay__content">
        <h2 id="dictionaries-overlay-title" className="dictionaries-overlay__title">
          dictionaries
        </h2>

        <ul className="dictionaries-overlay__list">
          {DICTIONARIES.map(entry => (
            <li key={entry.name} className="dictionaries-overlay__item">
              <div className="dictionaries-overlay__item-name">{entry.name}</div>
              <div className="dictionaries-overlay__item-description">{entry.description}</div>
            </li>
          ))}
        </ul>

        <div className="dictionaries-overlay__footnote">
          We allow for more words than other word games because ¯\_(ツ)_/¯.
        </div>
      </div>

      <button
        className="dictionaries-overlay__close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
