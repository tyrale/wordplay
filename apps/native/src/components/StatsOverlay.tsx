/**
 * Native Stats Overlay - direct port of apps/web's
 * `components/ui/StatsOverlay.tsx`. Simple full-screen informational
 * overlay listing the local player's lifetime stats log.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { getBotDisplayNamesMapping } from '@wordplay/engine/botRegistry';

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
  const { currentTheme } = useTheme();
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

  const renderSection = (title: string, rows: StatRow[]) => {
    if (rows.length === 0) return null;
    return (
      <View style={styles.section} key={title}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.accent }]}>{title}</Text>
        {rows.map(row => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.rowLabel, { color: currentTheme.colors.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: currentTheme.colors.text }]}>{row.value}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.overlay, { backgroundColor: currentTheme.colors.background }]} accessibilityRole="none">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: currentTheme.colors.accent }]}>stats</Text>

        {renderSection('Words', wordStats)}
        {renderSection('Games', gameStats)}
        {renderSection('Daily Challenge', challengeStats)}
        {renderSection('Bots', botStats)}
        {renderSection('Key Letters', keyLetterStats)}
        {renderSection('Meta', metaStats)}
      </ScrollView>

      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={[styles.closeButtonText, { color: currentTheme.colors.text }]}>×</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
    gap: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  section: {
    gap: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2
  },
  rowLabel: {
    fontSize: 13,
    flex: 1
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700'
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    padding: 12
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 32
  }
});
