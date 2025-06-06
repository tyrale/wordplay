import React from 'react';
import './SubmitButton.css';

export interface SubmitButtonProps {
  isValid: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isPassMode?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isValid,
  onClick,
  disabled = false,
  className = '',
  isPassMode = false
}) => {
  const canClick = (isValid || isPassMode) && !disabled && onClick;
  
  const handleClick = () => {
    if (canClick) {
      onClick!();
    }
  };

  const getButtonText = () => {
    if (isPassMode) {
      return 'pass turn';
    }
    return isValid ? '✓' : '✗';
  };

  const getAriaLabel = () => {
    if (isPassMode) {
      return 'Pass turn';
    }
    return isValid ? 'Submit word' : 'Word is invalid - click to pass turn';
  };

  return (
    <button
      className={`submit-button ${
        isValid ? 'submit-button--valid' : isPassMode ? 'submit-button--pass' : 'submit-button--invalid'
      } ${className}`.trim()}
      onClick={handleClick}
      disabled={!canClick}
      aria-label={getAriaLabel()}
      type="button"
    >
      {getButtonText()}
    </button>
  );
}; 