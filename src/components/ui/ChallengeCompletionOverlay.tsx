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

  // Function to render line with styled checkmark or X
  const renderShareLine = (line: string, index: number) => {
    // Check if this is the first line with checkmark or X
    if (index === 0 && (line.includes(' ✓ ') || line.includes(' ❌ '))) {
      if (line.includes(' ✓ ')) {
        // Split around checkmark and style it
        const parts = line.split(' ✓ ');
        return (
          <div key={index} className="challenge-completion__share-line">
            {parts[0]} <span className="challenge-completion__checkmark">✓</span> {parts[1]}
          </div>
        );
      } else if (line.includes(' ❌ ')) {
        // Split around red X and style it
        const parts = line.split(' ❌ ');
        return (
          <div key={index} className="challenge-completion__share-line">
            {parts[0]} <span className="challenge-completion__red-x">❌</span> {parts[1]}
          </div>
        );
      }
    }
    
    // Regular line rendering
    return (
      <div key={index} className="challenge-completion__share-line">
        {line}
      </div>
    );
  };

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
        {shareContent.map((line, index) => renderShareLine(line, index))}
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