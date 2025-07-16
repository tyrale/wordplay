import React, { useEffect } from 'react';
import './WinnerOverlay.css';

interface WinnerOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  finalScores?: { human: number; bot: number };
  botName?: string;
}

export const WinnerOverlay: React.FC<WinnerOverlayProps> = ({
  isVisible,
  onComplete,
  finalScores,
  botName
}) => {
  useEffect(() => {
    if (isVisible) {
      // Animation duration: winner (1.15s) + first cheer (1.15s delay + 0.85s) + second cheer (1.85s delay + 0.85s) = 2.7s total
      const timer = setTimeout(() => {
        onComplete();
      }, 2700);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="winner-overlay">
      <div className="winner-text">
        winner
      </div>
      <div className="winner-cheer">
        *cheer*
      </div>
      <div className="winner-cheer-second">
        *applause*
      </div>
      {finalScores && (
        <div className="winner-scores">
          <div>You: {finalScores.human}</div>
          <div>{botName || 'Bot'}: {finalScores.bot}</div>
        </div>
      )}
    </div>
  );
}; 