import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { getBotDisplayName } from '@wordplay/engine/botRegistry';
import { clearActiveGame } from './src/adapters/nativeGameSaveAdapter';

// Phase 3 (see docs/project/REACT_NATIVE_PORT_PLAN.md): a navigation shell
// replacing Phase 2's single always-mounted game screen. Only the "vs bot"
// flow is wired to a real screen - challenge/tutorial/zen and vs-human
// multiplayer are separate follow-up slices (see MainScreen.tsx and this
// file's placeholder alert below).
export type RootStackParamList = {
  Main: undefined;
  Game: { botId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainScreenRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Main'>) {
  const handleStartGame = (gameType: MainScreenGameType, botId?: string) => {
    if (gameType === 'bot' && botId) {
      navigation.navigate('Game', { botId });
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
      onStartMultiplayer={() => Alert.alert('Coming soon', 'Multiplayer isn\'t available in the native app yet.')}
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
  const { botId } = route.params;
  const [endOverlay, setEndOverlay] = useState<EndOverlayState | null>(null);
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

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

  return (
    <View style={{ flex: 1 }}>
      <InteractiveGame
        key={botId}
        botId={botId}
        botDisplayName={getBotDisplayName(botId)}
        onNavigateHome={() => navigation.goBack()}
        onResign={handleResign}
        onGameEnd={handleGameEnd}
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

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <NavigationContainer>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Main" component={MainScreenRoute} />
                    <Stack.Screen name="Game" component={GameScreenRoute} />
                  </Stack.Navigator>
                </NavigationContainer>
                <StatusBar style="auto" />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
