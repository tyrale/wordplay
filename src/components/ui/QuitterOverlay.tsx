import React, { useEffect } from 'react';
import './QuitterOverlay.css';

interface QuitterOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const QuitterOverlay: React.FC<QuitterOverlayProps> = ({
  isVisible,
  onComplete
}) => {
  useEffect(() => {
    if (isVisible) {
      // Animation duration: quitter (1.15s) + first cough (1.15s delay + 0.85s) + second cough (1.85s delay + 0.85s) = 2.7s total
      const timer = setTimeout(() => {
        onComplete();
      }, 2700);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="quitter-overlay">
      <div className="quitter-text">
        quitter
      </div>
      <div className="quitter-cough">
        *cough*
      </div>
      <div className="quitter-cough-second">
        *cough*
      </div>
    </div>
  );
}; 