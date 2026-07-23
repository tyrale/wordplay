import React, { useState, useEffect } from 'react';
import '../tutorial/TutorialOverlay.css';
import './NamePromptOverlay.css';

export interface NamePromptOverlayProps {
  isVisible: boolean;
  defaultName: string;
  onSubmit: (name: string) => void;
  /** First line of banner copy. Defaults to the vs-human first-time prompt. */
  title?: string;
  /** Second line of banner copy. */
  subtitle?: string;
  /** Label for the submit button. Defaults to "Continue". */
  submitLabel?: string;
  /**
   * When provided, renders a "Cancel" link and calls this instead of
   * `onSubmit` - used when re-opening the overlay to rename an already-set
   * display name (tapping your own name mid-game), where dismissing without
   * changes should be possible.
   */
  onCancel?: () => void;
}

/**
 * Shown once, the first time a player enters vs-human multiplayer, so they
 * can pick a vanity display name (shown to opponents in place of "P1"/"P2"
 * and as the game title in their active-games list). Purely cosmetic - the
 * player's unique id (used for all game logic) is unaffected and doesn't
 * need to be unique across the system.
 *
 * Also reused mid-game when a player taps their own name to rename
 * themselves (see `onCancel`).
 *
 * Reuses the exact same banner styling as the vs-bot tutorial and vs-world
 * intro (`TutorialOverlay.css`), just with a text input in place of the
 * scripted step lines.
 */
export const NamePromptOverlay: React.FC<NamePromptOverlayProps> = ({
  isVisible,
  defaultName,
  onSubmit,
  title = 'Pick a name',
  subtitle = 'Opponents will see this',
  submitLabel = 'Continue',
  onCancel
}) => {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (isVisible) setName(defaultName);
  }, [isVisible, defaultName]);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name.trim() || defaultName);
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-overlay__banner">
        <div className="tutorial-overlay__lines">
          <div className="tutorial-overlay__line">{title}</div>
          <div className="tutorial-overlay__line">{subtitle}</div>
        </div>

        <form className="name-prompt-banner__form" onSubmit={handleSubmit}>
          <input
            className="name-prompt-banner__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={10}
            autoFocus
          />
          <button type="submit" className="tutorial-overlay__skip name-prompt-banner__submit">
            {submitLabel}
          </button>
        </form>

        {onCancel && (
          <button type="button" className="tutorial-overlay__skip" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
