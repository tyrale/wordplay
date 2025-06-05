import React from 'react';
import './ScoreDisplay.css';

export interface ScoreBreakdown {
  base: number;
  keyBonus: number;
  total: number;
}

export interface ActionState {
  add: boolean;
  remove: boolean;
  move: boolean;
}

export interface ScoreDisplayProps {
  score: ScoreBreakdown;
  actions: ActionState;
  isValid: boolean;
  className?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  score, 
  actions,
  isValid,
  className = '' 
}) => {
  // Build action icons based on what actions were taken (like terminal game)
  const actionIcons = [];
  
  if (actions.add) {
    actionIcons.push('+');
  }
  if (actions.remove) {
    actionIcons.push('-');
  }
  if (actions.move) {
    actionIcons.push('~');
  }

  // Default display: show X for invalid word
  if (!isValid) {
    return (
      <div className={`score-display score-display--invalid ${className}`.trim()} role="status" aria-label="Invalid word">
        <span className="score-display__content">✗</span>
      </div>
    );
  }

  // If no actions taken, don't show anything
  if (actionIcons.length === 0) {
    return (
      <div className={`score-display score-display--empty ${className}`.trim()} role="status" aria-label="No actions">
        <span className="score-display__content"></span>
      </div>
    );
  }

  // Build scoring display like terminal game: "actions base +keyBonus"
  // Example: "+ | ~ 2 +1" means add + rearrange (2 pts) + key letter bonus (1 pt)
  let scoreLine = actionIcons.join(' | ');
  
  if (score.base > 0) {
    scoreLine += ` ${score.base}`;
  }
  
  if (score.keyBonus > 0) {
    scoreLine += ` +${score.keyBonus}`;
  }

  return (
    <div className={`score-display ${className}`.trim()} role="status" aria-label={`Score: ${scoreLine}`}>
      <span className="score-display__content">{scoreLine}</span>
    </div>
  );
}; 