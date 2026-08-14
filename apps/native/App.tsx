import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { AlertProvider } from './src/providers/AlertProvider';
import { UnlockProvider } from './src/providers/UnlockProvider';
import { MechanicsSettingsProvider } from './src/contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from './src/contexts/RoundLengthContext';
import { MainScreen } from './src/screens/MainScreen';
import type { MainScreenGameType } from './src/screens/MainScreen';
import { InteractiveGame } from './src/screens/InteractiveGame';
import { getBotDisplayName } from '@wordplay/engine/botRegistry';

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

function GameScreenRoute({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { botId } = route.params;
  return (
    <InteractiveGame
      key={botId}
      botId={botId}
      botDisplayName={getBotDisplayName(botId)}
      onExit={() => navigation.goBack()}
      onGameEnd={(winner, finalScores) => {
        Alert.alert(
          winner === 'human' ? 'You win!' : winner === 'bot' ? 'You lose' : 'Tie game',
          `Final score - You: ${finalScores.human}, ${getBotDisplayName(botId)}: ${finalScores.bot}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }}
    />
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
