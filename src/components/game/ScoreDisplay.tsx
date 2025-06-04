import React from 'react';
import './ScoreDisplay.css';

export interface ScoreBreakdown {
  base: number;
  keyBonus: number;
  total: number;
}

export interface ScoreDisplayProps {
  score: ScoreBreakdown;
  className?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  score, 
  className = '' 
}) => {
  const formatScore = (value: number) => {
    return value > 0 ? `+${value}` : '0';
  };

  return (
    <div className={`score-display ${className}`.trim()} role="status" aria-label={`Score: ${score.total} points`}>
      <span className="score-display__breakdown">
        {formatScore(score.base)} {formatScore(score.keyBonus)}
      </span>
    </div>
  );
}; 