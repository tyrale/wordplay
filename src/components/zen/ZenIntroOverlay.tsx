import React from 'react';
import '../tutorial/TutorialOverlay.css';

export interface ZenIntroOverlayProps {
  onDismiss: () => void;
}

/**
 * One-time banner shown the first time a player opens "vsnobody" (zen mode).
 * Reuses the exact same banner styling as the vs-bot tutorial
 * (`TutorialOverlay.css`), but is a single static message with no scripted
 * steps or game-state tracking.
 */
export const ZenIntroOverlay: React.FC<ZenIntroOverlayProps> = ({ onDismiss }) => {
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-overlay__banner">
        <div className="tutorial-overlay__lines">
          <div className="tutorial-overlay__line">Just you and the board. No points, no rounds.</div>
          <div className="tutorial-overlay__line">Double-tap ↻ for a brand new word and a clean trail.</div>
        </div>

        <button className="tutorial-overlay__skip" onClick={onDismiss} type="button">
          Got it
        </button>
      </div>
    </div>
  );
};
