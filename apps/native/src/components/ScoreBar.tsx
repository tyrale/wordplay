/**
 * Simplified port of apps/web's `components/game/ScoreBar.tsx` for this
 * Phase 2 slice - vanity display names (via nativeAuthAdapter) and the
 * multiplayer/self-tap-to-rename behavior are deferred; this just shows
 * each player's id-derived label and score, matching the bot-game default
 * (P1/bot name) case only.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Player } from '@wordplay/engine/interfaces';
import { useTheme } from '../theme/ThemeProvider';

export interface ScoreBarProps {
  players: Player[];
  botDisplayName?: string;
  currentRound?: number;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ players, botDisplayName, currentRound }) => {
  const { currentTheme } = useTheme();
  if (players.length === 0) return null;

  let humanIndex = 0;

  return (
    <View style={styles.stack}>
      {players.map(player => {
        const displayName = player.isBot ? (botDisplayName || player.name) : `P${humanIndex + 1}`;
        if (!player.isBot) humanIndex += 1;

        return (
          <View
            key={player.id}
            style={[
              styles.row,
              player.isCurrentPlayer && { backgroundColor: currentTheme.colors.surface }
            ]}
          >
            <Text style={[styles.name, { color: currentTheme.colors.text }]}>{displayName}</Text>
            <Text style={[styles.score, { color: currentTheme.colors.text }]}>
              {player.score === 0 ? '-' : player.score}
            </Text>
          </View>
        );
      })}
      {typeof currentRound === 'number' && (
        <Text style={[styles.round, { color: currentTheme.colors.textSecondary }]}>round {currentRound}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: 4
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 100
  },
  name: {
    fontSize: 14,
    fontWeight: '700'
  },
  score: {
    fontSize: 14,
    fontWeight: '700'
  },
  round: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2
  }
});
