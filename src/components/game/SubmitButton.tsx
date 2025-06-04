import React from 'react';
import './SubmitButton.css';

export interface SubmitButtonProps {
  isValid: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isValid,
  onClick,
  disabled = false,
  className = ''
}) => {
  const canClick = isValid && !disabled && onClick;
  
  const handleClick = () => {
    if (canClick) {
      onClick!();
    }
  };

  return (
    <button
      className={`submit-button ${
        isValid ? 'submit-button--valid' : 'submit-button--invalid'
      } ${className}`.trim()}
      onClick={handleClick}
      disabled={!canClick}
      aria-label={isValid ? 'Submit word' : 'Word is invalid'}
      type="button"
    >
      {isValid ? '✓' : '✗'}
    </button>
  );
}; 