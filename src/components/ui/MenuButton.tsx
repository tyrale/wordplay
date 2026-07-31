import React from 'react';
import { triggerSoundFeedback } from '../../utils/sound';
import './MenuButton.css';

interface MenuButtonProps {
  isMenuOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const MenuButton: React.FC<MenuButtonProps> = ({
  isMenuOpen,
  onClick,
  className = ''
}) => {
  return (
    <button
      className={`menu-button ${isMenuOpen ? 'menu-button--open' : ''} ${className}`.trim()}
      onClick={() => {
        triggerSoundFeedback('click');
        onClick();
      }}
      aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
      type="button"
    >
      <span className="menu-button__icon menu-button__icon--menu">≡</span>
      {isMenuOpen && (
        <span className="menu-button__icon menu-button__icon--close">×</span>
      )}
    </button>
  );
}; 