import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ThemedStatusBar } from './src/components/ThemedStatusBar';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme, getEffectiveColors } from './src/theme/ThemeProvider';
import { AlertProvider } from './src/providers/AlertProvider';
import { AlertOverlay } from './src/components/AlertOverlay';
import type { AlertOverlayVariant } from './src/components/AlertOverlay';
import { alertCopy, pickAlertVariant } from './src/content/alertCopy';
import { UnlockProvider } from './src/providers/UnlockProvider';
import { MechanicsSettingsProvider } from './src/contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from './src/contexts/RoundLengthContext';
import { MainScreen } from './src/screens/MainScreen';
import type { MainScreenGameType } from './src/screens/MainScreen';
import { InteractiveGame } from './src/screens/InteractiveGame';
import { ZenGame } from './src/screens/ZenGame';
import { ChallengeGame } from './src/screens/ChallengeGame';
import { BossBattleScreen } from './src/screens/BossBattleScreen';
import { MultiplayerLobby } from './src/screens/MultiplayerLobby';
import { MultiplayerGame } from './src/screens/MultiplayerGame';
import type { MultiplayerGameResult } from './src/screens/MultiplayerGame';
import { getBotDisplayName } from '@wordplay/engine/botRegistry';
import { clearActiveGame } from './src/adapters/nativeGameSaveAdapter';
import {
  saveActiveMultiplayerGameId,
  loadActiveMultiplayerGameId,
  clearActiveMultiplayerGameId
} from './src/adapters/nativeMultiplayerAdapter';
import { hasSeenTutorial } from './src/utils/tutorialStorage';
import { TUTORIAL_INITIAL_CONFIG } from './src/hooks/tutorialSteps';

// Phase 3/4 (see docs/project/REACT_NATIVE_PORT_PLAN.md): a navigation
// shell replacing Phase 2's single always-mounted game screen. Every
// single-player mode plus (Phase 4) vs-human multiplayer are wired to
// real screens.
export type RootStackParamList = {
  Main: undefined;
  /** `forceTutorial` lets the Menu's "the basics" entry replay the
   * tutorial on demand, bypassing the normal hasSeenTutorial() check
   * (see GameScreenRoute). */
  Game: { botId: string; forceTutorial?: boolean };
  Zen: undefined;
  Challenge: undefined;
  /** "GUS" boss battle encounter - reached by submitting "GUS" in a normal
   * bot game or the daily challenge. Always a `replace`, not a `navigate`
   * push: the game GUS was played in is abandoned, not something to "go
   * back" to (see GameScreenRoute/ChallengeGameRoute's onBossTrigger). */
  Boss: undefined;
  MultiplayerLobby: undefined;
  /** Native equivalent of web's `?mgame=<id>` URL param resume mechanism
   * (see nativeMultiplayerAdapter.ts's save/load/clearActiveMultiplayer
   * GameId - AsyncStorage instead of a URL, per the port plan's Phase 4
   * note). */
  MultiplayerGame: { gameId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainScreenRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Main'>) {
  const handleStartGame = (gameType: MainScreenGameType, botId?: string) => {
    if (gameType === 'bot' && botId) {
      navigation.navigate('Game', { botId });
      return;
    }
    if (gameType === 'zen') {
      navigation.navigate('Zen');
      return;
    }
    if (gameType === 'challenge') {
      navigation.navigate('Challenge');
      return;
    }
    if (gameType === 'tutorial' && botId) {
      // "the basics" - forces a fresh bot game with the tutorial replayed,
      // matching web's Menu "about" entry (beginTutorialGame).
      navigation.navigate('Game', { botId, forceTutorial: true });
      return;
    }
    Alert.alert('Coming soon', `"${gameType}" mode isn't available in the native app yet.`);
  };

  // MainScreen stays mounted across a Game screen push/pop (React
  // Navigation doesn't remount the previous screen), so its own
  // main-menu/bot-list sub-view state would otherwise still show "bots"
  // when returning here via resign/home. Remounting it on every focus
  // (via a changing key) resets that state without MainScreen itself
  // needing any navigation-context dependency - see its own doc comment.
  const [resetKey, setResetKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setResetKey(key => key + 1);
    }, [])
  );

  return (
    <MainScreen
      key={resetKey}
      onStartGame={handleStartGame}
      onStartMultiplayer={() => navigation.navigate('MultiplayerLobby')}
    />
  );
}

function MultiplayerLobbyRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'MultiplayerLobby'>) {
  return (
    <MultiplayerLobby
      onBack={() => navigation.goBack()}
      onGameReady={gameId => {
        saveActiveMultiplayerGameId(gameId).catch(err =>
          console.warn('Failed to persist active multiplayer game id:', err)
        );
        navigation.navigate('MultiplayerGame', { gameId });
      }}
    />
  );
}

interface EndOverlayState {
  lines: string[];
  variant?: AlertOverlayVariant;
  meta?: React.ReactNode;
}

/**
 * A bot game's win/lose/quit end screens, ported from apps/web's App.tsx
 * (handleGameEnd/handleResign/handleQuitterComplete/handleWinnerComplete/
 * handleLoserComplete + renderGameResultsMeta). Web renders these as
 * app-level AlertOverlays once its own `appState` string-union machine
 * leaves 'game' - since this app uses React Navigation screens instead of
 * that state machine, the same overlay is rendered here on top of
 * InteractiveGame (via AlertOverlay's own absolute positioning) rather
 * than after navigating away, then `navigation.goBack()` fires once the
 * overlay is dismissed.
 */
function GameScreenRoute({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { botId, forceTutorial } = route.params;
  const [endOverlay, setEndOverlay] = useState<EndOverlayState | null>(null);
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  // Resolved before InteractiveGame ever mounts, since its tutorial
  // config override (forced 'WORD' initialWord) must be present from the
  // very first render - useGameState only reads its config prop once, at
  // manager-creation time (see hooks/useGameState.ts).
  const [isTutorial, setIsTutorial] = useState<boolean | null>(forceTutorial ? true : null);
  useEffect(() => {
    if (isTutorial !== null) return;
    hasSeenTutorial().then(seen => setIsTutorial(!seen));
  }, [isTutorial]);

  const handleResign = useCallback(() => {
    // Resigning abandons the in-progress game without it ever reaching
    // 'finished' status, so the auto-save (which only clears on finish)
    // would otherwise still be sitting in storage - clear it explicitly,
    // matching web's handleResign.
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on resign:', err));
    const quitCopy = pickAlertVariant(alertCopy.quit);
    setEndOverlay({ lines: [...quitCopy.lines] });
  }, []);

  const handleGameEnd = useCallback((winner: string | null, finalScores: { human: number; bot: number }) => {
    // AlertOverlay only applies its own metaText styling (color/size/
    // alignment) to plain string `meta`; a custom ReactNode like this one
    // is rendered as-is, so each Text node needs its own explicit style -
    // RN has no CSS-style inheritance to fall back on.
    const metaTextStyle = { color: colors.text, fontSize: 14, textAlign: 'center' as const };
    const meta = (
      <>
        <Text style={metaTextStyle}>{`You: ${finalScores.human}`}</Text>
        <Text style={metaTextStyle}>{`${getBotDisplayName(botId)}: ${finalScores.bot}`}</Text>
      </>
    );
    if (winner === 'human') {
      const winCopy = pickAlertVariant(alertCopy.win);
      setEndOverlay({ lines: [...winCopy.lines], variant: 'win', meta });
    } else {
      // Tie is treated as a loss screen, matching web's handleGameEnd.
      const loseCopy = pickAlertVariant(alertCopy.lose);
      setEndOverlay({ lines: [...loseCopy.lines], variant: 'lose', meta });
    }
  }, [botId, colors.text]);

  // Brief, typically sub-frame wait for the AsyncStorage read to resolve;
  // rendering nothing here (rather than the game with a possibly-wrong
  // config) avoids ever mounting InteractiveGame with the wrong tutorial
  // decision baked in.
  if (isTutorial === null) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={{ flex: 1 }}>
      <InteractiveGame
        key={botId}
        botId={botId}
        botDisplayName={getBotDisplayName(botId)}
        config={isTutorial ? TUTORIAL_INITIAL_CONFIG : undefined}
        isTutorial={isTutorial}
        onTutorialComplete={() => setIsTutorial(false)}
        onNavigateHome={() => navigation.goBack()}
        onResign={handleResign}
        onGameEnd={handleGameEnd}
        // Only wired for a normal bot game, not the tutorial (matches
        // web's InteractiveGame.tsx comment on onBossTrigger).
        onBossTrigger={isTutorial ? undefined : () => {
          clearActiveGame().catch(err => console.warn('Failed to clear saved game on boss trigger:', err));
          navigation.replace('Boss');
        }}
      />
      <AlertOverlay
        isVisible={!!endOverlay}
        lines={endOverlay?.lines ?? []}
        variant={endOverlay?.variant}
        meta={endOverlay?.meta}
        onClose={() => {
          setEndOverlay(null);
          navigation.goBack();
        }}
      />
    </View>
  );
}

/**
 * A vs-human multiplayer game's win/lose/resigned end screens, ported
 * from apps/web's App.tsx (handleMultiplayerGameEnd + the same
 * win/lose/quit AlertOverlay rendering GameScreenRoute above uses for
 * bot games) - a resignation (by either player) shows a distinct "match
 * ended" overlay instead of a win/lose result, since it isn't a fairly-
 * earned outcome.
 */
function MultiplayerGameRoute({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'MultiplayerGame'>) {
  const { gameId } = route.params;
  const [endOverlay, setEndOverlay] = useState<EndOverlayState | null>(null);
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const clearAndGoTo = useCallback((target: 'lobby' | 'main') => {
    clearActiveMultiplayerGameId().catch(err => console.warn('Failed to clear active multiplayer game id:', err));
    if (target === 'lobby') {
      navigation.replace('MultiplayerLobby');
    } else {
      navigation.navigate('Main');
    }
  }, [navigation]);

  const handleGameEnd = useCallback(({ winnerId, localPlayerId, localScore, opponentScore, opponentName, resigned }: MultiplayerGameResult) => {
    if (resigned) {
      const resignedCopy = alertCopy.multiplayerResigned;
      setEndOverlay({ lines: [...resignedCopy.lines], meta: resignedCopy.meta });
      return;
    }

    const metaTextStyle = { color: colors.text, fontSize: 14, textAlign: 'center' as const };
    const meta = (
      <>
        <Text style={metaTextStyle}>{`You: ${localScore}`}</Text>
        <Text style={metaTextStyle}>{`${opponentName}: ${opponentScore}`}</Text>
      </>
    );

    if (winnerId === localPlayerId) {
      const winCopy = pickAlertVariant(alertCopy.win);
      setEndOverlay({ lines: [...winCopy.lines], variant: 'win', meta });
    } else {
      // Tie is treated as a loss screen, matching web's handleMultiplayerGameEnd.
      const loseCopy = pickAlertVariant(alertCopy.losePvp);
      setEndOverlay({ lines: [...loseCopy.lines], variant: 'lose', meta });
    }
  }, [colors.text]);

  return (
    <View style={{ flex: 1 }}>
      <MultiplayerGame
        key={gameId}
        gameId={gameId}
        onExit={() => clearAndGoTo('lobby')}
        onGameEnd={handleGameEnd}
        onBossTrigger={() => {
          clearActiveMultiplayerGameId().catch(err => console.warn('Failed to clear active multiplayer game id on boss trigger:', err));
          navigation.replace('Boss');
        }}
      />
      <AlertOverlay
        isVisible={!!endOverlay}
        lines={endOverlay?.lines ?? []}
        variant={endOverlay?.variant}
        meta={endOverlay?.meta}
        onClose={() => {
          setEndOverlay(null);
          clearAndGoTo('lobby');
        }}
      />
    </View>
  );
}

function ZenGameRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Zen'>) {
  return <ZenGame onNavigateHome={() => navigation.goBack()} />;
}

function ChallengeGameRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Challenge'>) {
  return (
    <ChallengeGame
      onNavigateHome={() => navigation.goBack()}
      onBossTrigger={() => navigation.replace('Boss')}
    />
  );
}

function BossBattleScreenRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Boss'>) {
  return <BossBattleScreen onExit={() => navigation.replace('Main')} />;
}

/**
 * Native equivalent of web's `getMultiplayerGameIdFromUrl()`/initial
 * `appState` computation: resume an in-progress multiplayer game across
 * an app restart (not just a screen navigation) rather than losing your
 * place and bouncing back to the main menu. Resolved once, before the
 * navigator ever mounts, so `initialRouteName`/`initialParams` reflect it
 * from the very first render instead of flashing the main menu first.
 */
function AppNavigator() {
  const [initialGameId, setInitialGameId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadActiveMultiplayerGameId()
      .then(setInitialGameId)
      .catch(() => setInitialGameId(null));
  }, []);

  if (initialGameId === undefined) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialGameId ? 'MultiplayerGame' : 'Main'}
      >
        <Stack.Screen name="Main" component={MainScreenRoute} />
        <Stack.Screen name="Game" component={GameScreenRoute} />
        <Stack.Screen name="Zen" component={ZenGameRoute} />
        <Stack.Screen name="Challenge" component={ChallengeGameRoute} />
        <Stack.Screen name="Boss" component={BossBattleScreenRoute} />
        <Stack.Screen name="MultiplayerLobby" component={MultiplayerLobbyRoute} />
        <Stack.Screen
          name="MultiplayerGame"
          component={MultiplayerGameRoute}
          initialParams={initialGameId ? { gameId: initialGameId } : undefined}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <AppNavigator />
                <ThemedStatusBar />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
