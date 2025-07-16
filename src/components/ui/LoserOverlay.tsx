import React, { useEffect } from 'react';
import './LoserOverlay.css';

interface LoserOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  finalScores?: { human: number; bot: number };
  botName?: string;
}

export const LoserOverlay: React.FC<LoserOverlayProps> = ({
  isVisible,
  onComplete,
  finalScores,
  botName
}) => {
  useEffect(() => {
    if (isVisible) {
      // Animation duration: loser (1.15s) + first sigh (1.15s delay + 0.85s) + second sigh (1.85s delay + 0.85s) = 2.7s total
      const timer = setTimeout(() => {
        onComplete();
      }, 2700);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="loser-overlay">
      <div className="loser-text">
        loser
      </div>
      <div className="loser-sigh">
        *sigh*
      </div>
      <div className="loser-sigh-second">
        *groan*
      </div>
      {finalScores && (
        <div className="loser-scores">
          <div>You: {finalScores.human}</div>
          <div>{botName || 'Bot'}: {finalScores.bot}</div>
        </div>
      )}
    </div>
  );
}; 