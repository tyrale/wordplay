/**
 * Ports apps/web's `components/ui/MainScreen.tsx`. The web version's own
 * "sub-view" state machine (main menu <-> bot list) is preserved as-is
 * (it's plain React state, not navigation - matching web, this screen
 * doesn't push a new route for the bot list). Vs-human multiplayer is
 * deferred to a later Phase 4 slice - the "human" button always falls
 * back to the locked-requirement message (via the real `AlertOverlay`,
 * matching web's declarative usage exactly) for now.
 *
 * Note (see App.tsx's MainScreenRoute): React Navigation keeps this
 * screen mounted in the stack rather than remounting it fresh, so
 * `currentView`'s "bots" sub-view would otherwise still be showing when
 * the player navigates back here (e.g. via resign/home from a game).
 * App.tsx remounts this component (via a changing `key`) on every focus
 * to reset it, rather than doing that reset in here - this keeps
 * MainScreen renderable/testable standalone, with no navigation context
 * dependency of its own.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useTheme } from '../theme/ThemeProvider';
import { getAllBots } from '@wordplay/engine/botRegistry';
import { Menu } from '../components/Menu';
import { AlertOverlay } from '../components/AlertOverlay';

export type MainScreenGameType = 'bot' | 'challenge' | 'tutorial' | 'zen';

export interface MainScreenProps {
  onStartGame: (gameType: MainScreenGameType, botId?: string) => void;
  onStartMultiplayer?: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onStartGame, onStartMultiplayer }) => {
  const { currentTheme } = useTheme();
  const [currentView, setCurrentView] = useState<'main' | 'bots'>('main');
  const [showVsHumanLocked, setShowVsHumanLocked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { getUnlockedItems, isUnlocked } = useUnlockSystem();
  const unlockedBotIds = getUnlockedItems('bot');
  const availableBots = getAllBots().filter(bot => unlockedBotIds.includes(bot.id));
  const isZenModeUnlocked = isUnlocked('mechanic', 'zen-mode');

  const handleGameTypeSelect = useCallback((gameType: string) => {
    if (gameType === 'vs-bot') {
      setCurrentView('bots');
    } else if (gameType === 'challenge') {
      onStartGame('challenge');
    } else if (gameType === 'zen') {
      onStartGame('zen');
    } else if (gameType === 'vs-human') {
      if (onStartMultiplayer) {
        onStartMultiplayer();
      } else {
        setShowVsHumanLocked(true);
      }
    }
  }, [onStartGame, onStartMultiplayer]);

  const handleBotSelect = useCallback((botId: string) => {
    onStartGame('bot', botId);
  }, [onStartGame]);

  const handleBack = useCallback(() => setCurrentView('main'), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {currentView !== 'main' && (
        <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: currentTheme.colors.text }]}>←</Text>
        </Pressable>
      )}

      <Pressable onPress={() => setIsMenuOpen(true)} accessibilityRole="button" accessibilityLabel="Open menu" style={styles.menuButton}>
        <Text style={[styles.menuButtonText, { color: currentTheme.colors.accent }]}>≡</Text>
      </Pressable>

      <View style={styles.content}>
        {currentView === 'main' && (
          <View style={styles.gameSelection}>
            <GameOption label="world" prefix="vs" onPress={() => handleGameTypeSelect('challenge')} color={currentTheme.colors.text} accentColor={currentTheme.colors.accent} />
            <GameOption label="human" prefix="vs" onPress={() => handleGameTypeSelect('vs-human')} color={currentTheme.colors.text} accentColor={currentTheme.colors.accent} />
            <GameOption label="bot" prefix="vs" onPress={() => handleGameTypeSelect('vs-bot')} color={currentTheme.colors.text} accentColor={currentTheme.colors.accent} />
            {isZenModeUnlocked && (
              <GameOption label="nobody" prefix="vs" onPress={() => handleGameTypeSelect('zen')} color={currentTheme.colors.text} accentColor={currentTheme.colors.accent} />
            )}
          </View>
        )}

        {currentView === 'bots' && (
          <View style={styles.botList}>
            {availableBots.map(bot => (
              <Pressable
                key={bot.id}
                onPress={() => handleBotSelect(bot.id)}
                style={({ pressed }) => [styles.botOption, { opacity: pressed ? 0.6 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={[styles.botOptionText, { color: currentTheme.colors.text }]}>{bot.displayName}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onStartGame={(gameType, botId) => onStartGame(gameType, botId)}
        onNavigateHome={() => setIsMenuOpen(false)}
      />

      <AlertOverlay
        isVisible={showVsHumanLocked}
        lines={['BEAT', 'EASYBOT', 'FIRST']}
        onClose={() => setShowVsHumanLocked(false)}
      />
    </SafeAreaView>
  );
};

const GameOption: React.FC<{ label: string; prefix: string; onPress: () => void; color: string; accentColor: string }> = ({
  label,
  prefix,
  onPress,
  color,
  accentColor
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.gameOption, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
    <Text style={styles.gameOptionText}>
      <Text style={{ color: accentColor, fontWeight: '900' }}>{prefix}</Text>
      <Text style={{ color }}>{label}</Text>
    </Text>
  </Pressable>
);

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
    fontSize: 38,
    fontWeight: '900'
  },
  menuButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 1,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuButtonText: {
    fontSize: 38,
    fontWeight: '900'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
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
  }
});
