import React from 'react';
import './GridCell.css';
import { LockIcon } from './LockIcon';

export type GridCellState = 'normal' | 'key' | 'locked' | 'lockedKey' | 'disabled';
export type GridCellType = 'letter' | 'action';

export interface GridCellProps {
  content: string;
  state?: GridCellState;
  type?: GridCellType;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
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
  onMouseDown,
  onTouchStart,
  draggable = false,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!disabled && onDragStart) {
      onDragStart(e);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!disabled && onDragEnd) {
      onDragEnd(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled && onMouseDown) {
      onMouseDown(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!disabled && onTouchStart) {
      onTouchStart(e);
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
    <div
      className={cellClasses}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      draggable={draggable && !disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel || content}
      data-letter={type === 'letter' ? content : undefined}
      data-type={type}
    >
      <span className="grid-cell__content">
        {content}
      </span>
      {(state === 'locked' || state === 'lockedKey') && (
        <span className="grid-cell__lock" aria-hidden="true">
          <LockIcon size={12} />
        </span>
      )}
    </div>
  );
}; 