/**
 * Ports apps/web's `components/multiplayer/MultiplayerGame.tsx`. Renders
 * a vs-human multiplayer game using the *exact same* `InteractiveGame`
 * board component used for vs-bot games - just driven by a
 * `RemoteGameStateManager` instead of the local bot manager, via
 * `InteractiveGame`'s `externalManager`/`localPlayerId`/`currentGameMode`
 * props (see that file's doc comment). This keeps the board layout/
 * behavior identical between game modes.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InteractiveGame } from './InteractiveGame';
import { useMultiplayerManager } from '../hooks/useMultiplayerManager';
import { getGameJoinInfo, startWaitingGame } from '../adapters/nativeMultiplayerAdapter';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export interface MultiplayerGameResult {
  winnerId: string | null;
  localPlayerId: string;
  localScore: number;
  opponentScore: number;
  /** The opponent's vanity display name, for the end-of-game overlay. */
  opponentName: string;
  /** True if the game ended because a player resigned, rather than reaching
   * max turns naturally - shown as a distinct "match ended" overlay instead
   * of a win/lose result. */
  resigned: boolean;
  /** Every player in the match with their final score, for showing a full
   * scoreboard on the end-of-game overlay (rather than just you + one
   * opponent) in 3+ player games. */
  allPlayers: { id: string; name: string; score: number; isLocal: boolean }[];
}

export interface MultiplayerGameProps {
  gameId: string;
  onExit: () => void;
  onGameEnd?: (result: MultiplayerGameResult) => void;
  /**
   * Fired when the local player submits a word that should trigger the boss
   * battle encounter (currently "GUS"). When set, MultiplayerGame resigns
   * the match server-side (so the opponent is notified) before forwarding
   * the trigger to the parent, which abandons this view for the boss battle.
   */
  onBossTrigger?: (word: string) => void;
}

export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ gameId, onExit, onGameEnd, onBossTrigger }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  // See MainScreen.tsx's identical comment: `backButton` below is
  // `position: 'absolute'`, so SafeAreaView's own inset padding doesn't
  // apply to it - without this it sits under Android's gesture/3-button
  // nav bar.
  const insets = useSafeAreaInsets();
  const { manager, localPlayerId, isLoading, error } = useMultiplayerManager(gameId);
  const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  // Bumped on every manager update so the waiting-room view re-renders as
  // more players join or the host starts the game.
  const [, forceRerender] = useState(0);
  const { getUnlockedItems } = useUnlockSystem();
  // Only show the "host toggled time" heads-up once per game session -
  // deferred: native doesn't have the time-pressure mechanic wired into
  // InteractiveGame.tsx at all yet (Phase 3 note), so there's nothing to
  // alert about here regardless; kept as a documented gap, not silently
  // dropped, matching web's intent for when that mechanic is ported.
  void getUnlockedItems;

  useEffect(() => {
    if (!manager) return;
    const unsubscribe = manager.subscribe(() => forceRerender(n => n + 1));
    return unsubscribe;
  }, [manager]);

  useEffect(() => {
    let cancelled = false;
    getGameJoinInfo(gameId).then(info => {
      if (!cancelled && info) setMaxPlayers(info.maxPlayers);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const handleStartWaitingGame = useCallback(async () => {
    setIsStarting(true);
    try {
      await startWaitingGame(gameId);
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setIsStarting(false);
    }
  }, [gameId]);

  const handleResign = useCallback(async () => {
    if (!manager) {
      onExit();
      return;
    }
    try {
      // Don't call onExit() here - the resulting state change (synced to
      // both players) fires onGameEnd below with resigned: true, which
      // shows the "match ended" overlay and exits from there instead.
      await manager.resign();
    } catch (err) {
      console.error('Failed to resign from multiplayer game:', err);
      onExit();
    }
  }, [manager, onExit]);

  const handleCancelWaiting = useCallback(async () => {
    if (!manager) {
      onExit();
      return;
    }
    try {
      await manager.resign();
    } catch (err) {
      console.error('Failed to cancel waiting game:', err);
    }
    onExit();
  }, [manager, onExit]);

  const handleBossTrigger = useCallback((word: string) => {
    if (word.toUpperCase() !== 'GUS') return;
    if (manager) {
      manager.resign().catch(err => console.warn('Failed to resign multiplayer game on boss trigger:', err));
    }
    onBossTrigger?.(word);
  }, [manager, onBossTrigger]);

  const handleGameEnd = useCallback((winnerId: string | null, finalScores: { human: number; bot: number }) => {
    if (!manager || !localPlayerId) return;
    const allPlayers = manager.getState().players;
    const others = allPlayers.filter(p => p.id !== localPlayerId);
    // "Opponent" for the end-of-game meta text: the winner if the local
    // player lost, otherwise the highest-scoring other player - works the
    // same as before for 2-player games, and picks the most relevant
    // reference point for N-player games.
    const opponent =
      (winnerId && winnerId !== localPlayerId ? others.find(p => p.id === winnerId) : null) ||
      [...others].sort((a, b) => b.score - a.score)[0];
    onGameEnd?.({
      winnerId,
      localPlayerId,
      localScore: finalScores.human,
      opponentScore: finalScores.bot,
      opponentName: opponent?.name || 'Opponent',
      resigned: manager.wasAbandoned(),
      allPlayers: allPlayers.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isLocal: p.id === localPlayerId
      }))
    });
  }, [manager, localPlayerId, onGameEnd]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading game…</Text>
      </SafeAreaView>
    );
  }

  if (error || !manager || !localPlayerId) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>{error ?? 'Failed to load game'}</Text>
        <Pressable onPress={onExit} accessibilityRole="button">
          <Text style={[styles.backLink, { color: colors.accent }]}>Back to Menu</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const state = manager.getState();

  // vsmany "Create" games stay 'waiting' until either the host manually
  // starts (once >= 2 players have joined) or the game fills up to
  // max_players - show a lobby-style screen instead of the board until then.
  if (state.gameStatus === 'waiting') {
    const isHost = state.players[0]?.id === localPlayerId;
    return (
      <SafeAreaView style={[styles.waiting, { backgroundColor: colors.background }]}>
        <Text style={[styles.waitingTitle, { color: colors.text }]}>Waiting for players…</Text>
        {state.players.map(player => (
          <Text key={player.id} style={[styles.waitingPlayer, { color: colors.text }]}>
            {player.id === localPlayerId ? `${player.name} (you)` : player.name}
          </Text>
        ))}
        <Text style={[styles.waitingCount, { color: colors.textSecondary }]}>
          {state.players.length}{maxPlayers ? ` / ${maxPlayers}` : ''} joined
        </Text>
        {isHost && state.players.length >= 2 && (
          <Pressable
            onPress={handleStartWaitingGame}
            disabled={isStarting}
            accessibilityRole="button"
            style={{ opacity: isStarting ? 0.5 : 1 }}
          >
            <Text style={[styles.startButtonText, { color: colors.accent }]}>
              {isStarting ? 'Starting…' : 'Start'}
            </Text>
          </Pressable>
        )}
        {!isHost && <Text style={[styles.waitingHint, { color: colors.textSecondary }]}>Waiting on the host to start…</Text>}
        <Pressable onPress={handleCancelWaiting} accessibilityRole="button">
          <Text style={[styles.cancelLink, { color: colors.text }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onExit} style={[styles.backButton, { bottom: insets.bottom + 20 }]} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <InteractiveGame
      externalManager={manager}
      localPlayerId={localPlayerId}
      currentGameMode="multiplayer"
      onGameEnd={handleGameEnd}
      onResign={handleResign}
      onNavigateHome={onExit}
      onBossTrigger={onBossTrigger ? handleBossTrigger : undefined}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700'
  },
  backLink: {
    fontSize: 16,
    fontWeight: '900'
  },
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '900'
  },
  waitingPlayer: {
    fontSize: 16,
    fontWeight: '700'
  },
  waitingCount: {
    fontSize: 14
  },
  waitingHint: {
    fontSize: 14
  },
  startButtonText: {
    fontSize: 32,
    fontWeight: '900'
  },
  cancelLink: {
    fontSize: 15,
    fontWeight: '700'
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    padding: 8
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: '900'
  }
});
