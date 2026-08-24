/**
 * Native Leaderboard Overlay - direct port of apps/web's
 * `components/ui/LeaderboardOverlay.tsx`. Full-screen overlay showing
 * today's daily challenge words and a histogram of completions by step
 * count. If the local player has completed today's challenge, their row
 * is highlighted and marked "YOU".
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { useChallengeLeaderboard, getTodayChallengeDate } from '../hooks/useChallengeLeaderboard';

export interface LeaderboardOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ isVisible, onClose }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const today = getTodayChallengeDate();
  const { entries, isLoading, error, localResult } = useChallengeLeaderboard(isVisible ? today : null);

  if (!isVisible) return null;

  const localStepCount = localResult?.completed ? localResult.stepCount : null;
  const hasEntries = entries.length > 0;
  const emptyMessage = localResult?.completed ? "you're the first to complete today" : 'no completions yet';

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} accessibilityRole="none">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.accent }]}>leaderboard</Text>

        {localResult ? (
          <View style={styles.words}>
            <Text style={[styles.word, { color: colors.text }]}>{localResult.startWord}</Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
            <Text style={[styles.word, { color: colors.text }]}>{localResult.targetWord}</Text>
          </View>
        ) : (
          <Text style={[styles.emptyWords, { color: colors.textSecondary }]}>no challenge started today</Text>
        )}

        {isLoading ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>loading…</Text>
        ) : error ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{error}</Text>
        ) : hasEntries ? (
          <View style={styles.list}>
            {entries.map(entry => {
              const isYou = localStepCount !== null && entry.stepCount === localStepCount;
              const stepColor = isYou ? colors.accent : colors.text;
              return (
                <View key={entry.stepCount} style={styles.row}>
                  <Text style={[styles.steps, { color: stepColor }]}>{entry.stepCount}</Text>
                  <Text style={[styles.dash, { color: colors.textSecondary }]}>-</Text>
                  <Text style={[styles.count, { color: colors.text }]}>{entry.playerCount}</Text>
                  {isYou && <Text style={[styles.you, { color: colors.accent }]}>YOU</Text>}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        )}
      </ScrollView>

      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
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
    alignItems: 'center',
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  words: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  word: {
    fontSize: 18,
    fontWeight: '900'
  },
  arrow: {
    fontSize: 16
  },
  emptyWords: {
    fontSize: 14
  },
  list: {
    width: '100%',
    maxWidth: 240,
    gap: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  steps: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'right'
  },
  dash: {
    fontSize: 16
  },
  count: {
    fontSize: 16,
    flex: 1
  },
  you: {
    fontSize: 12,
    fontWeight: '900'
  },
  empty: {
    fontSize: 14
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
