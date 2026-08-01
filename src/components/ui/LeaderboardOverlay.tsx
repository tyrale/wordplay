/**
 * Leaderboard Overlay
 *
 * Full-screen overlay (same flat visual language as `StatsOverlay`) showing
 * today's daily challenge leaderboard: the challenge words at the top, then a
 * histogram of how many players completed the challenge in each step count.
 *
 * The list is plain "1 - 5" rows (step count, no dot, dash, player count).
 * If the local player has completed today's challenge, the row matching their
 * step count is colored with the theme accent and marked "YOU". Player counts
 * include the local player themselves. No names or identifying data are shown.
 */

import React from 'react';
import {
  useChallengeLeaderboard,
  getTodayChallengeDate
} from '../../hooks/useChallengeLeaderboard';
import './LeaderboardOverlay.css';

export interface LeaderboardOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ isVisible, onClose }) => {
  const today = getTodayChallengeDate();
  const { entries, isLoading, error, localResult } = useChallengeLeaderboard(isVisible ? today : null);

  if (!isVisible) return null;

  // The local player's own step count, but only once they've actually reached
  // the target word (a forfeited/failed challenge never lands on the board).
  const localStepCount = localResult?.completed ? localResult.stepCount : null;
  const hasEntries = entries.length > 0;

  const emptyMessage = localResult?.completed
    ? "you're the first to complete today"
    : 'no completions yet';

  return (
    <div
      className="leaderboard-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-overlay-title"
    >
      <div className="leaderboard-overlay__content">
        <h2 id="leaderboard-overlay-title" className="leaderboard-overlay__title">
          leaderboard
        </h2>

        {localResult ? (
          <div className="leaderboard-overlay__words">
            <span className="leaderboard-overlay__word">{localResult.startWord}</span>
            <span className="leaderboard-overlay__arrow">→</span>
            <span className="leaderboard-overlay__word">{localResult.targetWord}</span>
          </div>
        ) : (
          <div className="leaderboard-overlay__words leaderboard-overlay__words--empty">
            no challenge started today
          </div>
        )}

        {isLoading ? (
          <div className="leaderboard-overlay__empty">loading…</div>
        ) : error ? (
          <div className="leaderboard-overlay__empty">{error}</div>
        ) : hasEntries ? (
          <ul className="leaderboard-overlay__list">
            {entries.map(entry => {
              const isYou = localStepCount !== null && entry.stepCount === localStepCount;
              return (
                <li key={entry.stepCount} className="leaderboard-overlay__item">
                  <span
                    className={`leaderboard-overlay__steps${isYou ? ' leaderboard-overlay__steps--you' : ''}`}
                  >
                    {entry.stepCount}
                  </span>
                  <span className="leaderboard-overlay__dash">-</span>
                  <span className="leaderboard-overlay__count">{entry.playerCount}</span>
                  {isYou && <span className="leaderboard-overlay__you">YOU</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="leaderboard-overlay__empty">{emptyMessage}</div>
        )}
      </div>

      <button
        className="leaderboard-overlay__close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
