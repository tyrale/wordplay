/**
 * Thoughts Overlay
 *
 * Simple full-screen informational overlay (same flat visual language as
 * `DictionariesOverlay` / `AlertOverlay`) listing a numbered set of
 * thoughts/notes to be filled in.
 */

import React from 'react';
import { triggerSoundFeedback } from '../../utils/sound';
import './ThoughtsOverlay.css';

export interface ThoughtsOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const THOUGHTS: string[] = [
  'Dark mode is my favorite. So it is hard to find.',
  'Unlocks will never alter points or give advantage.'
];

export const ThoughtsOverlay: React.FC<ThoughtsOverlayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div
      className="thoughts-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thoughts-overlay-title"
    >
      <div className="thoughts-overlay__content">

        <ol className="thoughts-overlay__list">
          {THOUGHTS.map((thought, index) => (
            <li key={index} className="thoughts-overlay__item">
              {thought}
            </li>
          ))}
        </ol>
      </div>

      <button
        className="thoughts-overlay__close"
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
