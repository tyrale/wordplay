import React from 'react';
import './SubmitButton.css';

export interface SubmitButtonProps {
  isValid: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isPassMode?: boolean;
  isInvalid: boolean;
  isPassConfirming: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isValid,
  onClick,
  disabled = false,
  className = '',
  isPassMode = false,
  isInvalid,
  isPassConfirming
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

  const icon = isInvalid || isPassConfirming ? '×' : '✓';
  const buttonClass = `submit-button ${
    isInvalid || isPassConfirming ? 'submit-button--invalid' : 'submit-button--valid'
  } ${className}`.trim();

  return (
    <button
      className={buttonClass}
      onClick={handleClick}
      disabled={!canClick}
      aria-label={getAriaLabel()}
      type="button"
    >
      {icon}
    </button>
  );
}; 