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

  // Parse share text to extract step count and format content
  const lines = shareText.split('\n').filter(line => line.trim());
  const shareContent = lines.slice(0, -1); // All lines except the last
  const stepCount = lines[lines.length - 1]; // Last line contains step count

  return (
    <div 
      className="challenge-completion-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-completion-title"
    >
      {/* Flat design - no modal container */}
      <h1 
        id="challenge-completion-title"
        className="challenge-completion__title"
      >
        {isWinner ? 'Winner' : 'Loser'}
      </h1>
      
      {/* Share content stacked vertically */}
      <div className="challenge-completion__share-content">
        {shareContent.map((line, index) => (
          <div key={index} className="challenge-completion__share-line">
            {line}
          </div>
        ))}
      </div>
      
      {/* Step count as separate element */}
      <div className="challenge-completion__step-count">
        {stepCount}
      </div>
      
      {/* Action buttons stacked vertically */}
      <div className="challenge-completion__actions">
        <button
          className="challenge-completion__action"
          onClick={handleHomeClick}
          aria-label="Return to main menu"
        >
          home
        </button>
        <button
          className="challenge-completion__action"
          onClick={handleShareClick}
          aria-label="Share challenge result"
        >
          share
        </button>
      </div>
    </div>
  );
}; 