import React from 'react';
import './GridCell.css';

export type GridCellState = 'normal' | 'key' | 'locked' | 'disabled';
export type GridCellType = 'letter' | 'action';

export interface GridCellProps {
  content: string;
  state?: GridCellState;
  type?: GridCellType;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export const GridCell: React.FC<GridCellProps> = ({
  content,
  state = 'normal',
  type = 'letter',
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const cellClasses = [
    'grid-cell',
    `grid-cell--${state}`,
    `grid-cell--${type}`,
    disabled && 'grid-cell--disabled',
    onClick && !disabled && 'grid-cell--interactive'
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cellClasses}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel || content}
      type="button"
    >
      <span className="grid-cell__content">
        {content}
      </span>
      {state === 'locked' && (
        <span className="grid-cell__lock" aria-hidden="true">
          🔒
        </span>
      )}
    </button>
  );
}; 