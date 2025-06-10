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
  isPassConfirming: boolean;
  passReason: string | null;
  onClick?: () => void;
  className?: string;
  isPassMode?: boolean;
  validationError?: string | null;
  showValidationError?: boolean;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  score, 
  actions,
  isValid,
  isPassConfirming,
  passReason,
  onClick,
  className = '',
  isPassMode = false,
  validationError = null,
  showValidationError = false
}) => {
  // Build action icons based on what actions were taken (like image)
  const actionIcons = [];
  
  if (actions.move) {
    actionIcons.push('~');
  }
  if (actions.remove) {
    actionIcons.push('-');
  }
  if (actions.add) {
    actionIcons.push('+');
  }

  const isEmpty = actionIcons.length === 0;

  // Build left side content (actions or validation error)
  let leftContent = '';
  if (showValidationError) {
    // Show validation error on the left, or default message if no specific error
            leftContent = validationError || 'current word';
  } else if (!isEmpty) {
    // Show action icons when there are actions
    leftContent = actionIcons.join(' ');
  }
  
  // Build center content (checkmark/pass/error)
  let centerContent = isPassMode ? 'pass turn' : (isValid && !isEmpty) ? '✓' : '✗';
  
  // Build right side content (scores or pass instruction)
  let rightContent = '';
  
  if (showValidationError) {
    // Show pass instruction on the right when showing validation error
    rightContent = 'tap to pass';
  } else if (!isEmpty && !isPassMode) {
    // Show normal score
    if (score.base > 0) {
      rightContent = `${score.base}`;
    } else {
      rightContent = '0';
    }
    
    if (score.keyBonus > 0) {
      rightContent += ` +${score.keyBonus}`;
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
  };

  const isClickable = !!onClick; // Always clickable if onClick handler provided

  if (isPassConfirming) {
    return (
      <div className={`score-display score-display--pass-confirm ${className || ''}`} onClick={onClick}>
        <span className="score-display__reason">{passReason}</span>
        <span className="score-display__pass-x">×</span>
        <span className="score-display__pass-prompt">tap again to pass</span>
      </div>
    );
  }

  return (
    <div 
      className={`score-display ${isPassMode ? 'score-display--pass' : isValid && !isEmpty ? 'score-display--valid' : 'score-display--invalid'} ${isClickable ? 'score-display--clickable' : ''} ${isEmpty ? 'score-display--empty' : ''} ${showValidationError ? 'score-display--error' : ''} ${className}`.trim()} 
      role={isClickable ? 'button' : 'status'}
      aria-label={isClickable ? `Submit word: ${leftContent} ${centerContent} ${rightContent}` : `Score: ${leftContent} ${centerContent} ${rightContent}`}
      onClick={isClickable ? handleClick : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <span className="score-display__left">{leftContent}</span>
      <span className="score-display__center">{centerContent}</span>
      <span className="score-display__right">{rightContent}</span>
    </div>
  );
}; 