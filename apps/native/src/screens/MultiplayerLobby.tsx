/**
 * Ports apps/web's `components/multiplayer/MultiplayerLobby.tsx`. Same
 * two-step menu (vsone/vsmany, then Create/Join/Random), same pairing
 * helpers from `nativeMultiplayerAdapter.ts` - the logic here is a direct
 * port; only the presentation is rebuilt for RN (no CSS slide
 * animations - `menuStep` still switches which action list renders, just
 * without the timed exit/enter transition web does via CSS classes).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createInviteGame,
  joinGameByInviteCode,
  findMatch,
  listMyActiveGames,
  getOpponentName,
  startWaitingGame,
  getGameJoinInfo,
  cancelGame
} from '../adapters/nativeMultiplayerAdapter';
import type { MatchmakingHandle, MatchmakingMode, ActiveGameSummary, GameJoinInfo } from '../adapters/nativeMultiplayerAdapter';
import { supabase } from '../lib/supabase';
import { getDisplayName, setDisplayName, hasConfirmedDisplayName, markDisplayNameConfirmed } from '../adapters/nativeAuthAdapter';
import { NamePromptOverlay } from '../components/NamePromptOverlay';
import { useMechanicsSettings } from '../contexts/MechanicsSettingsContext';
import { useRoundLength } from '../contexts/RoundLengthContext';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { shareInviteCode } from '../utils/shareUtils';

// Starting-word-length mechanics a host might have unlocked/toggled on -
// mirrors the same pick logic InteractiveGame.tsx uses for vs-bot games.
const START_WORD_LENGTHS = [3, 5, 6, 7, 8, 9, 10];

export interface MultiplayerLobbyProps {
  onGameReady: (gameId: string) => void;
  onBack: () => void;
}

type LobbyView = 'menu' | 'create' | 'join' | 'matchmaking';
type LobbyAction = 'create' | 'join' | 'random';

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onGameReady, onBack }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const [view, setView] = useState<LobbyView>('menu');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [activeGames, setActiveGames] = useState<ActiveGameSummary[]>([]);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [readyGameId, setReadyGameId] = useState<string | null>(null);
  const matchmakingHandleRef = useRef<MatchmakingHandle | null>(null);
  const [menuStep, setMenuStep] = useState<'mode' | 'action'>('mode');
  const [selectedMode, setSelectedMode] = useState<MatchmakingMode | null>(null);
  const [createMode, setCreateMode] = useState<MatchmakingMode>('vsone');
  const [createGameId, setCreateGameId] = useState<string | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<GameJoinInfo['players']>([]);
  const createCleanupRef = useRef<(() => void) | null>(null);
  const [displayName, setDisplayNameState] = useState('');

  const { isMechanicOn } = useMechanicsSettings();
  const { roundLength } = useRoundLength();
  const { getUnlockedItems } = useUnlockSystem();
  const unlockedMechanics = getUnlockedItems('mechanic');
  const isTimePressureOn = unlockedMechanics.includes('time-pressure') && isMechanicOn('time-pressure');
  const availableStartLengths = START_WORD_LENGTHS.filter(len =>
    unlockedMechanics.includes(`${len}-letter-start`) && isMechanicOn(`${len}-letter-start`)
  );
  const startingWordLength = availableStartLengths.length > 0
    ? availableStartLengths[Math.floor(Math.random() * availableStartLengths.length)]
    : undefined;

  useEffect(() => {
    listMyActiveGames().then(setActiveGames).catch(() => setActiveGames([]));
    hasConfirmedDisplayName().then(confirmed => setShowNamePrompt(!confirmed));
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    return () => {
      createCleanupRef.current?.();
    };
  }, []);

  const handleNameSubmit = useCallback(async (name: string) => {
    await setDisplayName(name);
    await markDisplayNameConfirmed();
    setDisplayNameState(name);
    setShowNamePrompt(false);
  }, []);

  const handleCreateInvite = useCallback(async (mode: MatchmakingMode) => {
    setView('create');
    setError(null);
    setIsBusy(true);
    setOpponentName(null);
    setReadyGameId(null);
    setCreateMode(mode);
    setCreateGameId(null);
    setJoinedPlayers([]);
    try {
      const { gameId, inviteCode: code } = await createInviteGame({
        maxPlayers: mode === 'vsmany' ? 8 : 2,
        maxTurns: roundLength,
        initialWordLength: startingWordLength,
        timePressureEnabled: isTimePressureOn
      });
      setInviteCode(code);
      setCreateGameId(gameId);
      getGameJoinInfo(gameId).then((info) => {
        if (info) setJoinedPlayers(info.players);
      });

      const channel = supabase
        .channel(`lobby-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload: { new?: { status?: string } }) => {
            if (payload.new?.status === 'active') {
              supabase.removeChannel(channel);
              if (mode === 'vsone') {
                getOpponentName(gameId).then((name) => {
                  setOpponentName(name || 'Your opponent');
                  setReadyGameId(gameId);
                });
              } else {
                onGameReady(gameId);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
          () => {
            getGameJoinInfo(gameId).then((info) => {
              if (info) setJoinedPlayers(info.players);
            });
          }
        )
        .subscribe();
      createCleanupRef.current = () => supabase.removeChannel(channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsBusy(false);
    }
  }, [onGameReady, roundLength, startingWordLength, isTimePressureOn]);

  const handleStartGame = useCallback(() => {
    if (readyGameId) onGameReady(readyGameId);
  }, [readyGameId, onGameReady]);

  const handleStartVsManyGame = useCallback(async () => {
    if (!createGameId) return;
    setIsBusy(true);
    setError(null);
    try {
      await startWaitingGame(createGameId);
      onGameReady(createGameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsBusy(false);
    }
  }, [createGameId, onGameReady]);

  const handleShareInvite = useCallback(async () => {
    if (!inviteCode) return;
    await shareInviteCode(inviteCode);
  }, [inviteCode]);

  const handleJoin = useCallback(async () => {
    setError(null);
    setIsBusy(true);
    try {
      const gameId = await joinGameByInviteCode(joinCodeInput);
      onGameReady(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setIsBusy(false);
    }
  }, [joinCodeInput, onGameReady]);

  const handleFindMatch = useCallback(async (mode: MatchmakingMode) => {
    setView('matchmaking');
    setError(null);
    setIsBusy(true);
    try {
      const handle = await findMatch((gameId) => {
        onGameReady(gameId);
      }, mode, { timePressureEnabled: isTimePressureOn });
      matchmakingHandleRef.current = handle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for a match');
    } finally {
      setIsBusy(false);
    }
  }, [onGameReady, isTimePressureOn]);

  const handleSelectMode = useCallback((mode: MatchmakingMode) => {
    setSelectedMode(mode);
    setMenuStep('action');
  }, []);

  const handleActionSelect = useCallback((action: LobbyAction) => {
    const mode = selectedMode ?? 'vsone';
    if (action === 'create') {
      handleCreateInvite(mode);
    } else if (action === 'join') {
      setView('join');
    } else {
      handleFindMatch(mode);
    }
  }, [selectedMode, handleCreateInvite, handleFindMatch]);

  const handleCancelMatchmaking = useCallback(async () => {
    await matchmakingHandleRef.current?.cancel();
    matchmakingHandleRef.current = null;
    setView('menu');
  }, []);

  const handleCancelGame = useCallback(async (gameId: string) => {
    try {
      await cancelGame(gameId);
      setActiveGames(prev => prev.filter(g => g.gameId !== gameId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel game');
    }
  }, []);

  const handleBackToMenu = useCallback(() => {
    setView('menu');
    setError(null);
    setInviteCode(null);
    setOpponentName(null);
    setReadyGameId(null);
    setMenuStep('mode');
    setSelectedMode(null);
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'menu') {
      if (menuStep === 'action') {
        setMenuStep('mode');
        setSelectedMode(null);
        return;
      }
      onBack();
      return;
    }
    if (view === 'matchmaking') {
      handleCancelMatchmaking();
      return;
    }
    handleBackToMenu();
  }, [view, menuStep, onBack, handleCancelMatchmaking, handleBackToMenu]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        onPress={handleBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel={view === 'create' ? 'Close' : 'Back'}
      >
        <Text style={[styles.backButtonText, { color: colors.text }]}>{view === 'create' ? '×' : '←'}</Text>
      </Pressable>

      <View style={styles.content}>
        {view === 'menu' && (
          <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menu}>
            {menuStep === 'mode' && (
              // Matches MainScreen.tsx's top-level game-mode selection
              // (`gameSelection`/`gameOption`/`gameOptionText`) exactly.
              <View style={styles.gameSelection}>
                <Pressable onPress={() => handleSelectMode('vsone')} style={({ pressed }) => [styles.gameOption, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
                  <Text style={styles.gameOptionText}>
                    <Text style={{ color: colors.accent }}>vs</Text>
                    <Text style={{ color: colors.text }}>one</Text>
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleSelectMode('vsmany')} style={({ pressed }) => [styles.gameOption, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
                  <Text style={styles.gameOptionText}>
                    <Text style={{ color: colors.accent }}>vs</Text>
                    <Text style={{ color: colors.text }}>many</Text>
                  </Text>
                </Pressable>
              </View>
            )}

            {menuStep === 'action' && (
              // Matches MainScreen.tsx's bot-selection list
              // (`botList`/`botOption`/`botOptionText`) exactly.
              <View style={styles.botList}>
                <Pressable onPress={() => handleActionSelect('create')} style={({ pressed }) => [styles.botOption, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
                  <Text style={[styles.botOptionText, { color: colors.text }]}>Create</Text>
                </Pressable>
                <Pressable onPress={() => handleActionSelect('join')} style={({ pressed }) => [styles.botOption, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
                  <Text style={[styles.botOptionText, { color: colors.text }]}>Join</Text>
                </Pressable>
                <Pressable onPress={() => handleActionSelect('random')} style={({ pressed }) => [styles.botOption, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
                  <Text style={[styles.botOptionText, { color: colors.text }]}>Random</Text>
                </Pressable>
              </View>
            )}

            {activeGames.length > 0 && (
              <View style={styles.games}>
                <Text style={[styles.gamesTitle, { color: colors.textSecondary }]}>Games in Progress</Text>
                {activeGames.map(game => (
                  <View key={game.gameId} style={styles.gameRow}>
                    <Pressable onPress={() => onGameReady(game.gameId)} style={styles.gameLink} accessibilityRole="button">
                      <Text style={[styles.gameLinkText, { color: colors.text }]}>{game.opponentName}</Text>
                      <Text style={[styles.gameStatus, { color: colors.textSecondary }]}>
                        {game.status === 'waiting' ? 'waiting' : game.isMyTurn ? 'your turn' : 'their turn'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleCancelGame(game.gameId)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel game"
                    >
                      <Text style={[styles.gameCancel, { color: colors.textSecondary }]}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {view === 'create' && (
          <View style={styles.panel}>
            {isBusy && !inviteCode && <ActivityIndicator color={colors.accent} />}
            {inviteCode && createMode === 'vsone' && !opponentName && (
              <>
                <Text style={[styles.shareLabel, { color: colors.textSecondary }]}>Share this:</Text>
                <View style={styles.codeRow}>
                  <Text style={[styles.code, { color: colors.accent }]}>{inviteCode}</Text>
                  <Pressable onPress={handleShareInvite} accessibilityRole="button" accessibilityLabel="Share invite code">
                    <Text style={[styles.shareIcon, { color: colors.text }]}>↑</Text>
                  </Pressable>
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Waiting on player(s)…</Text>
              </>
            )}
            {opponentName && createMode === 'vsone' && (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{opponentName} joined!</Text>
                <Pressable onPress={handleStartGame} accessibilityRole="button">
                  <Text style={[styles.linkText, { color: colors.text }]}>Start</Text>
                </Pressable>
              </>
            )}
            {inviteCode && createMode === 'vsmany' && (
              <>
                <Text style={[styles.shareLabel, { color: colors.textSecondary }]}>Share this:</Text>
                <View style={styles.codeRow}>
                  <Text style={[styles.code, { color: colors.accent }]}>{inviteCode}</Text>
                  <Pressable onPress={handleShareInvite} accessibilityRole="button" accessibilityLabel="Share invite code">
                    <Text style={[styles.shareIcon, { color: colors.text }]}>↑</Text>
                  </Pressable>
                </View>
                {joinedPlayers.map(player => (
                  <Text key={player.id} style={[styles.joinedPlayer, { color: colors.text }]}>{player.name}</Text>
                ))}
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{joinedPlayers.length} / 8 joined</Text>
                <Pressable
                  onPress={handleStartVsManyGame}
                  disabled={isBusy || joinedPlayers.length < 2}
                  accessibilityRole="button"
                  style={{ opacity: isBusy || joinedPlayers.length < 2 ? 0.4 : 1 }}
                >
                  <Text style={[styles.linkText, { color: colors.text }]}>{isBusy ? 'Starting…' : 'Start'}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {view === 'join' && (
          <View style={styles.panel}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Join a Game</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.text }]}
              value={joinCodeInput}
              onChangeText={text => setJoinCodeInput(text.toUpperCase())}
              placeholder="Enter code"
              placeholderTextColor={colors.textSecondary}
              maxLength={6}
              autoFocus
              autoCapitalize="characters"
            />
            <Pressable
              onPress={handleJoin}
              disabled={isBusy || joinCodeInput.trim().length === 0}
              accessibilityRole="button"
              style={{ opacity: isBusy || joinCodeInput.trim().length === 0 ? 0.4 : 1 }}
            >
              <Text style={[styles.linkText, { color: colors.text }]}>{isBusy ? 'Joining…' : 'Join'}</Text>
            </Pressable>
            <Pressable onPress={handleBackToMenu} accessibilityRole="button">
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {view === 'matchmaking' && (
          <View style={styles.panel}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Finding a Match…</Text>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>This may take a moment.</Text>
            <Pressable onPress={handleCancelMatchmaking} accessibilityRole="button">
              <Text style={[styles.linkText, { color: colors.text }]}>Cancel Search</Text>
            </Pressable>
          </View>
        )}

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
      </View>

      <NamePromptOverlay isVisible={showNamePrompt} defaultName={displayName} onSubmit={handleNameSubmit} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  backButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 1,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButtonText: {
    // Matches MainScreen.tsx's backButtonText - same 60px button.
    fontSize: 29,
    fontWeight: '900'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  menuScroll: {
    flexGrow: 0,
    width: '100%'
  },
  menu: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24
  },
  // Matches MainScreen.tsx's gameSelection/gameOption/gameOptionText
  // exactly (the vsone/vsmany mode step).
  gameSelection: {
    gap: 24,
    alignItems: 'center'
  },
  gameOption: {
    paddingVertical: 8
  },
  gameOptionText: {
    fontSize: 28,
    fontWeight: '900'
  },
  // Matches MainScreen.tsx's botList/botOption/botOptionText exactly
  // (the Create/Join/Random action step).
  botList: {
    gap: 16,
    alignItems: 'center'
  },
  botOption: {
    paddingVertical: 8
  },
  botOptionText: {
    fontSize: 26,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  linkText: {
    fontSize: 32,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  games: {
    alignItems: 'center',
    gap: 8,
    width: '100%'
  },
  gamesTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6
  },
  gameLink: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1
  },
  gameLinkText: {
    fontSize: 16,
    fontWeight: '700'
  },
  gameStatus: {
    fontSize: 12
  },
  gameCancel: {
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 8
  },
  panel: {
    alignItems: 'center',
    gap: 16
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900'
  },
  shareLabel: {
    fontSize: 14
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  code: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 4
  },
  shareIcon: {
    fontSize: 24,
    fontWeight: '900'
  },
  hint: {
    fontSize: 14
  },
  joinedPlayer: {
    fontSize: 16,
    fontWeight: '700'
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    minWidth: 160,
    letterSpacing: 2
  },
  error: {
    marginTop: 16,
    color: '#DC2626',
    textAlign: 'center'
  }
});
