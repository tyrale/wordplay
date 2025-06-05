import React from 'react';
import './GridCell.css';

export type GridCellState = 'normal' | 'key' | 'locked' | 'disabled';
export type GridCellType = 'letter' | 'action';

export interface GridCellProps {
  content: string;
  state?: GridCellState;
  type?: GridCellType;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLButtonElement>) => void;
  draggable?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

export const GridCell: React.FC<GridCellProps> = ({
  content,
  state = 'normal',
  type = 'letter',
  onClick,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  draggable = false,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!disabled && onDragStart) {
      onDragStart(e);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!disabled && onDragEnd) {
      onDragEnd(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!disabled && onTouchStart) {
      onTouchStart(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!disabled && onTouchMove) {
      onTouchMove(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!disabled && onTouchEnd) {
      onTouchEnd(e);
    }
  };

  const cellClasses = [
    'grid-cell',
    `grid-cell--${state}`,
    `grid-cell--${type}`,
    disabled && 'grid-cell--disabled',
    onClick && !disabled && 'grid-cell--interactive',
    draggable && !disabled && 'grid-cell--draggable'
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cellClasses}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      draggable={draggable && !disabled}
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