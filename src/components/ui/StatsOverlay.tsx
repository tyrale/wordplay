/**
 * Stats Overlay
 *
 * Simple full-screen informational overlay (same flat visual language as
 * `DictionariesOverlay` / `ThoughtsOverlay`) listing the local player's
 * lifetime stats log.
 */

import React from 'react';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { getBotDisplayNamesMapping } from '../../data/botRegistry';
import './StatsOverlay.css';

export interface StatsOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

interface StatRow {
  label: string;
  value: string;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'never';
  return new Date(timestamp).toLocaleDateString();
}

function topEntry(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return 'none yet';
  const [letter, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${letter} (${count}x)`;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({ isVisible, onClose }) => {
  const { stats } = usePlayerStats();

  if (!isVisible) return null;

  const botDisplayNames = getBotDisplayNamesMapping();

  const wordStats: StatRow[] = [
    { label: 'Words played', value: String(stats.totalWordsPlayed) },
    { label: 'Passes', value: String(stats.totalPasses) },
    { label: 'Longest word', value: stats.longestWordPlayed || 'none yet' },
    { label: 'Shortest word', value: stats.shortestWordPlayed || 'none yet' },
    { label: 'Letters added', value: String(stats.totalLettersAdded) },
    { label: 'Letters removed', value: String(stats.totalLettersRemoved) },
    { label: 'Rearranges', value: String(stats.totalRearranges) },
    { label: 'Substitutions', value: String(stats.totalSubstitutions) },
    { label: 'Most used letter', value: topEntry(stats.letterUsageCounts) }
  ];

  const gameStats: StatRow[] = [
    { label: 'Games played', value: String(stats.gamesPlayed) },
    { label: 'Games won', value: String(stats.gamesWon) },
    { label: 'Games lost', value: String(stats.gamesLost) },
    { label: 'Games tied', value: String(stats.gamesTied) },
    { label: 'Current win streak', value: String(stats.currentWinStreak) },
    { label: 'Longest win streak', value: String(stats.longestWinStreak) },
    { label: 'Perfect games', value: String(stats.perfectGames) },
    { label: 'Total turns played', value: String(stats.totalTurnsPlayed) },
    { label: 'Longest game (turns)', value: String(stats.longestGameTurns) },
    { label: 'Shortest game (turns)', value: String(stats.shortestGameTurns) },
    { label: 'Total score', value: String(stats.totalScore) },
    { label: 'Highest game score', value: String(stats.highestGameScore) },
    { label: 'Highest single move score', value: String(stats.highestSingleMoveScore) },
    { label: 'Total play time', value: formatDuration(stats.totalPlayTimeMs) },
    { label: 'Longest game duration', value: formatDuration(stats.longestGameDurationMs) },
    { label: 'Fastest win', value: stats.fastestWinDurationMs > 0 ? formatDuration(stats.fastestWinDurationMs) : 'none yet' }
  ];

  const challengeStats: StatRow[] = [
    { label: 'Challenges played', value: String(stats.challengesPlayed) },
    { label: 'Challenges completed', value: String(stats.challengesCompleted) },
    { label: 'Challenges failed', value: String(stats.challengesFailed) },
    { label: 'Current completion streak', value: String(stats.currentChallengeStreak) },
    { label: 'Longest completion streak', value: String(stats.longestChallengeStreak) },
    { label: 'Shortest challenge (steps)', value: String(stats.shortestChallengeSteps) },
    { label: 'Longest challenge (steps)', value: String(stats.longestChallengeSteps) },
    { label: 'Fewest steps to complete', value: stats.fewestStepsToComplete > 0 ? String(stats.fewestStepsToComplete) : 'none yet' }
  ];

  const botStats: StatRow[] = Object.entries(stats.botRecords).map(([botId, record]) => ({
    label: botDisplayNames[botId] || botId,
    value: `${record.wins}W - ${record.losses}L (${record.gamesPlayed} played)`
  }));

  const keyLetterStats: StatRow[] = [
    { label: 'Most used key letter', value: topEntry(stats.keyLetterUsageCounts) },
    { label: 'Key letter points', value: String(stats.totalKeyLetterPoints) }
  ];

  const metaStats: StatRow[] = [
    { label: 'Unlocks earned', value: String(stats.totalUnlocksEarned) },
    { label: 'First played', value: formatDate(stats.firstPlayedAt) },
    { label: 'Last played', value: formatDate(stats.lastPlayedAt) },
    { label: 'Current daily streak', value: `${stats.currentDailyStreak} day(s)` },
    { label: 'Longest daily streak', value: `${stats.longestDailyStreak} day(s)` }
  ];

  const renderSection = (title: string, rows: StatRow[]) => (
    rows.length === 0 ? null : (
      <div className="stats-overlay__section" key={title}>
        <h3 className="stats-overlay__section-title">{title}</h3>
        <ul className="stats-overlay__list">
          {rows.map(row => (
            <li key={row.label} className="stats-overlay__item">
              <span className="stats-overlay__item-label">{row.label}</span>
              <span className="stats-overlay__item-value">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  );

  return (
    <div
      className="stats-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-overlay-title"
    >
      <div className="stats-overlay__content">
        <h2 id="stats-overlay-title" className="stats-overlay__title">
          stats
        </h2>

        {renderSection('Words', wordStats)}
        {renderSection('Games', gameStats)}
        {renderSection('Daily Challenge', challengeStats)}
        {renderSection('Bots', botStats)}
        {renderSection('Key Letters', keyLetterStats)}
        {renderSection('Meta', metaStats)}
      </div>

      <button
        className="stats-overlay__close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
