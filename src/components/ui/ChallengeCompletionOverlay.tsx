/**
 * Challenge Completion Overlay Component
 * 
 * Modal overlay shown when a challenge is completed or resigned.
 * Displays winner/loser status, sharing format, and action buttons.
 * Designed to be cross-platform compatible.
 */

import React from 'react';
import './ChallengeCompletionOverlay.css';

export interface ChallengeCompletionOverlayProps {
  isVisible: boolean;
  isWinner: boolean; // true = "Winner", false = "Loser"
  shareText: string; // Pre-formatted sharing text from challenge engine
  onHome: () => void; // Platform-agnostic exit handler
  onShare: (shareText: string) => void; // Platform-specific share handler
  onClose?: () => void; // Optional overlay close
}

export const ChallengeCompletionOverlay: React.FC<ChallengeCompletionOverlayProps> = ({
  isVisible,
  isWinner,
  shareText,
  onHome,
  onShare,
  onClose
}) => {
  if (!isVisible) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const handleShareClick = () => {
    onShare(shareText);
  };

  const handleHomeClick = () => {
    onHome();
  };

  return (
    <div 
      className="challenge-completion-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-completion-title"
    >
      <div className="challenge-completion-modal">
        {/* Headline */}
        <div className="challenge-completion__header">
          <h1 
            id="challenge-completion-title"
            className="challenge-completion__title"
          >
            {isWinner ? 'Winner' : 'Loser'}
          </h1>
        </div>

        {/* Share format display */}
        <div className="challenge-completion__share-content">
          <pre className="challenge-completion__share-text">
            {shareText}
          </pre>
        </div>

        {/* Action buttons */}
        <div className="challenge-completion__actions">
          <button
            className="challenge-completion__action challenge-completion__action--share"
            onClick={handleShareClick}
            aria-label="Share challenge result"
          >
            share
          </button>
          <button
            className="challenge-completion__action challenge-completion__action--home"
            onClick={handleHomeClick}
            aria-label="Return to main menu"
          >
            home
          </button>
        </div>
      </div>
    </div>
  );
}; 