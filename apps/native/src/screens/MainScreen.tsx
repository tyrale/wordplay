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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { getAllBots } from '@wordplay/engine/botRegistry';
import { Menu } from '../components/Menu';
import { AlertOverlay } from '../components/AlertOverlay';
import { triggerSoundFeedback } from '../utils/sound';

export type MainScreenGameType = 'bot' | 'challenge' | 'tutorial' | 'zen';

export interface MainScreenProps {
  onStartGame: (gameType: MainScreenGameType, botId?: string) => void;
  onStartMultiplayer?: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onStartGame, onStartMultiplayer }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  // SafeAreaView's own inset padding doesn't apply to these buttons since
  // they're `position: 'absolute'` (see InteractiveGame.tsx's identical
  // comment on its header) - on Android, that leaves them sitting right
  // under the gesture nav bar / 3-button nav, which covers them. Reading
  // the inset directly and folding it into `bottom` sidesteps that.
  const insets = useSafeAreaInsets();
  const [currentView, setCurrentView] = useState<'main' | 'bots'>('main');
  const [showVsHumanLocked, setShowVsHumanLocked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { getUnlockedItems, isUnlocked } = useUnlockSystem();
  const unlockedBotIds = getUnlockedItems('bot');
  const availableBots = getAllBots().filter(bot => unlockedBotIds.includes(bot.id));
  const isZenModeUnlocked = isUnlocked('mechanic', 'zen-mode');

  const handleGameTypeSelect = useCallback((gameType: string) => {
    triggerSoundFeedback('click');
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
    triggerSoundFeedback('click');
    onStartGame('bot', botId);
  }, [onStartGame]);

  const handleBack = useCallback(() => {
    triggerSoundFeedback('click');
    setCurrentView('main');
  }, []);

  const handleMenuOpen = useCallback(() => {
    triggerSoundFeedback('click');
    setIsMenuOpen(true);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {currentView !== 'main' && (
        <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backButton, { bottom: insets.bottom + 8 }]}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
        </Pressable>
      )}

      <Pressable onPress={handleMenuOpen} accessibilityRole="button" accessibilityLabel="Open menu" style={[styles.menuButton, { bottom: insets.bottom + 8 }]}>
        <Text style={[styles.menuButtonText, { color: colors.accent }]}>≡</Text>
      </Pressable>

      <View style={styles.content}>
        {currentView === 'main' && (
          <View style={styles.gameSelection}>
            <GameOption label="world" prefix="vs" onPress={() => handleGameTypeSelect('challenge')} color={colors.text} accentColor={colors.accent} />
            <GameOption label="human" prefix="vs" onPress={() => handleGameTypeSelect('vs-human')} color={colors.text} accentColor={colors.accent} />
            <GameOption label="bot" prefix="vs" onPress={() => handleGameTypeSelect('vs-bot')} color={colors.text} accentColor={colors.accent} />
            {isZenModeUnlocked && (
              <GameOption label="nobody" prefix="vs" onPress={() => handleGameTypeSelect('zen')} color={colors.text} accentColor={colors.accent} />
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
                <Text style={[styles.botOptionText, { color: colors.text }]}>{bot.displayName}</Text>
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
    // Matches GridCell.tsx's action-glyph ratio for a 60px button
    // (60 * 0.482) after the same on-device size correction.
    fontSize: 29,
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
    // See backButtonText's identical comment.
    fontSize: 29,
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
