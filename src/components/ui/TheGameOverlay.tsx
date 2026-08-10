/**
 * The Game Overlay
 *
 * Simple full-screen informational overlay (same flat visual language as
 * `DictionariesOverlay` / `ThoughtsOverlay`) describing reword and why it
 * was built.
 */

import React from 'react';
import { triggerSoundFeedback } from '../../utils/sound';
import './TheGameOverlay.css';

export interface TheGameOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const PARAGRAPHS: string[] = [
  'reword is a word game about finding as many words as you can hiding inside one long word.',
  'I built it because I wanted a quick, replayable word game I could play in a couple of minutes, and because I love watching people discover words they didn\'t know they knew.',
  'It\'s a side project made in my spare time. Thanks for playing.'
];

export const TheGameOverlay: React.FC<TheGameOverlayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div
      className="the-game-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="the-game-overlay-title"
    >
      <div className="the-game-overlay__content">
        <h2 id="the-game-overlay-title" className="the-game-overlay__title">
          the game
        </h2>

        <div className="the-game-overlay__list">
          {PARAGRAPHS.map((paragraph, index) => (
            <p key={index} className="the-game-overlay__item">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <button
        className="the-game-overlay__close"
        onClick={() => {
          triggerSoundFeedback('click');
          onClose();
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
