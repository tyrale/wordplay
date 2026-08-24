/**
 * Ports apps/web's `components/game/ScoreBar.tsx`. Phase 2's slice only
 * needed the bot-game default (P1/bot name) case; Phase 4 (vs-human
 * multiplayer) adds real vanity display names via `isMultiplayer` -
 * without it, both multiplayer players would show as "P1"/"P2" since
 * neither has `isBot: true` the way a real bot opponent does.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Player } from '@wordplay/engine/interfaces';
import { useTheme } from '../theme/ThemeProvider';
import { getDisplayName as getVanityName, hasConfirmedDisplayName } from '../adapters/nativeAuthAdapter';

export interface ScoreBarProps {
  players: Player[];
  botDisplayName?: string;
  /** vs-human multiplayer: show each player's vanity name instead of P1/P2. */
  isMultiplayer?: boolean;
  currentRound?: number;
  /** Authenticated player id treated as "the local player" in multiplayer
   * games, used to identify which row is tappable for renaming. */
  localPlayerId?: string;
  /** Called when the local player taps their own name, to open the
   * rename overlay. */
  onOwnNameTap?: () => void;
}

/**
 * Own display name always comes from local storage (kept in sync with the
 * server in multiplayer via setDisplayName), so a rename is reflected
 * immediately without waiting on a server refetch - matches web exactly.
 */
function getDisplayName(player: Player, humanIndex: number, isSelf: boolean, botDisplayName: string | undefined, isMultiplayer: boolean, hasConfirmedName: boolean): string {
  if (player.isBot) {
    return botDisplayName || player.name;
  }
  if (hasConfirmedName && (isMultiplayer ? isSelf : humanIndex === 0)) {
    return getVanityName();
  }
  if (isMultiplayer) {
    return player.name;
  }
  return `P${humanIndex + 1}`;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  players,
  botDisplayName,
  isMultiplayer = false,
  currentRound,
  localPlayerId,
  onOwnNameTap
}) => {
  const { currentTheme } = useTheme();

  // `hasConfirmedDisplayName()` is async (AsyncStorage-backed) on native,
  // unlike web's synchronous localStorage read - synchronously assume
  // "confirmed" is false on first render (falls back to P1/vanilla player
  // name, same as before any name was ever set) rather than blocking this
  // component on a storage read; it'll only ever actually matter once the
  // name prompt has already resolved earlier in the multiplayer flow
  // anyway (see MultiplayerLobby.tsx), so this isn't a real gap in
  // practice.
  //
  // Both hooks must run before the `players.length === 0` early return
  // below - hooks can never be conditional (Rules of Hooks), and this one
  // used to sit after the early return, which broke the moment `players`
  // transitioned from empty to non-empty between renders (changing hook
  // call order and crashing with "Expected static flag was missing").
  const [hasConfirmedName, setHasConfirmedName] = React.useState(false);
  React.useEffect(() => {
    hasConfirmedDisplayName().then(setHasConfirmedName);
  }, []);

  if (players.length === 0) return null;

  let humanIndex = 0;

  return (
    <View style={styles.stack}>
      {players.map(player => {
        // In multiplayer, "self" is the authenticated localPlayerId; in
        // vs-bot/tutorial play, the first non-bot player is always self.
        const isSelf = !player.isBot && (localPlayerId ? player.id === localPlayerId : humanIndex === 0);
        const displayName = getDisplayName(player, humanIndex, isSelf, botDisplayName, isMultiplayer, hasConfirmedName);
        if (!player.isBot) humanIndex += 1;
        const rowColor = player.isCurrentPlayer ? currentTheme.colors.accent : currentTheme.colors.text;

        const row = (
          <View style={styles.row}>
            <Text style={[styles.name, { color: rowColor }]}>{displayName}</Text>
            <Text style={[styles.score, { color: rowColor }]}>
              {player.score === 0 ? '-' : player.score}
            </Text>
          </View>
        );

        if (isSelf && onOwnNameTap) {
          return (
            <Pressable key={player.id} onPress={onOwnNameTap} accessibilityRole="button" accessibilityLabel={`Rename yourself (currently ${displayName})`}>
              {row}
            </Pressable>
          );
        }

        return <View key={player.id}>{row}</View>;
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
  // Heaviest weight available (900) - a player's actual score value,
  // same treatment as ScoreDisplay.tsx's score/checkmark and Menu.tsx's
  // "N/N unlocked" counts.
  score: {
    fontSize: 16,
    fontWeight: '900'
  },
  round: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 2
  }
});
