import React from 'react';
import '../tutorial/TutorialOverlay.css';

export interface ChallengeIntroOverlayProps {
  onDismiss: () => void;
}

/**
 * One-time banner shown the first time a player opens "vs world" (challenge
 * mode). Reuses the exact same banner styling as the vs-bot tutorial
 * (`TutorialOverlay.css`), but is a single static message with no scripted
 * steps or game-state tracking.
 */
export const ChallengeIntroOverlay: React.FC<ChallengeIntroOverlayProps> = ({ onDismiss }) => {
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-overlay__banner">
        <div className="tutorial-overlay__lines">
          <div className="tutorial-overlay__line">A start word, and a finish word.</div>
          <div className="tutorial-overlay__line">Take turns to kevin bacon the path.</div>
        </div>

        <button className="tutorial-overlay__skip" onClick={onDismiss} type="button">
          Got it
        </button>
      </div>
    </div>
  );
};
