import React from 'react';
import './ActionIndicators.css';

export interface ActionState {
  add: boolean;
  remove: boolean;
  move: boolean;
}

export interface ActionIndicatorsProps {
  actions: ActionState;
  className?: string;
}

export const ActionIndicators: React.FC<ActionIndicatorsProps> = ({ 
  actions, 
  className = '' 
}) => {
  return (
    <div className={`action-indicators ${className}`.trim()}>
      {actions.remove && (
        <span className="action-indicators__symbol" aria-label="Letter removed">
          −
        </span>
      )}
      {actions.add && (
        <span className="action-indicators__symbol" aria-label="Letter added">
          +
        </span>
      )}
      {actions.move && (
        <span className="action-indicators__symbol" aria-label="Letters moved">
          ~
        </span>
      )}
    </div>
  );
}; 