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
        const rowColor = player.isCurrentPlayer ? currentTheme.colors.accent : currentTheme.colors.text;

        return (
          // Left-aligned as a compact inline pill (name + score together),
          // matching web's ScoreBar.css exactly - not a name/score pair
          // spread across a fixed-width row.
          <View key={player.id} style={styles.row}>
            <Text style={[styles.name, { color: rowColor }]}>{displayName}</Text>
            <Text style={[styles.score, { color: rowColor }]}>
              {player.score === 0 ? '-' : player.score}
            </Text>
          </View>
        );
      })}
      {typeof currentRound === 'number' && (
        <Text style={[styles.round, { color: currentTheme.colors.text }]}>round {currentRound}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    alignItems: 'flex-start',
    gap: 4
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 2
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  score: {
    fontSize: 16,
    fontWeight: '700'
  },
  round: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 2
  }
});
