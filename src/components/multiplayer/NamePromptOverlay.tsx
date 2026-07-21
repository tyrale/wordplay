import React, { useState } from 'react';
import './NamePromptOverlay.css';

export interface NamePromptOverlayProps {
  isVisible: boolean;
  defaultName: string;
  onSubmit: (name: string) => void;
}

/**
 * Shown once, the first time a player enters vs-human multiplayer, so they
 * can pick a vanity display name (shown to opponents in place of "P1"/"P2"
 * and as the game title in their active-games list). Purely cosmetic - the
 * player's unique id (used for all game logic) is unaffected and doesn't
 * need to be unique across the system.
 */
export const NamePromptOverlay: React.FC<NamePromptOverlayProps> = ({ isVisible, defaultName, onSubmit }) => {
  const [name, setName] = useState(defaultName);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name.trim() || defaultName);
  };

  return (
    <div className="name-prompt-overlay">
      <div className="name-prompt-dialog">
        <form className="name-prompt-dialog__content" onSubmit={handleSubmit}>
          <h3 className="name-prompt-dialog__title">Pick a Name</h3>
          <p className="name-prompt-dialog__message">
            This is how opponents will see you. It doesn't need to be unique.
          </p>
          <input
            className="name-prompt-dialog__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="name-prompt-dialog__action">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};
