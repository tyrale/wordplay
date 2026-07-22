import React, { useState } from 'react';
import '../tutorial/TutorialOverlay.css';
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
 *
 * Reuses the exact same banner styling as the vs-bot tutorial and vs-world
 * intro (`TutorialOverlay.css`), just with a text input in place of the
 * scripted step lines.
 */
export const NamePromptOverlay: React.FC<NamePromptOverlayProps> = ({ isVisible, defaultName, onSubmit }) => {
  const [name, setName] = useState(defaultName);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name.trim() || defaultName);
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-overlay__banner">
        <div className="tutorial-overlay__lines">
          <div className="tutorial-overlay__line">Pick a name</div>
          <div className="tutorial-overlay__line">Opponents will see this</div>
        </div>

        <form className="name-prompt-banner__form" onSubmit={handleSubmit}>
          <input
            className="name-prompt-banner__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="tutorial-overlay__skip name-prompt-banner__submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};
