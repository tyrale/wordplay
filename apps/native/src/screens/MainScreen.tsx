/**
 * Ports apps/web's `components/ui/MainScreen.tsx`. The web version's own
 * "sub-view" state machine (main menu <-> bot list) is preserved as-is
 * (it's plain React state, not navigation - matching web, this screen
 * doesn't push a new route for the bot list). The settings `Menu`
 * overlay, `AlertOverlay`, and vs-human multiplayer are deferred to
 * later Phase 3/4 slices (see this repo's port plan) - the "vs human"
 * button always falls back to the locked-requirement message for now.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useTheme } from '../theme/ThemeProvider';
import { getAllBots } from '@wordplay/engine/botRegistry';

export type MainScreenGameType = 'bot' | 'challenge' | 'tutorial' | 'zen';

export interface MainScreenProps {
  onStartGame: (gameType: MainScreenGameType, botId?: string) => void;
  onStartMultiplayer?: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onStartGame, onStartMultiplayer }) => {
  const { currentTheme } = useTheme();
  const [currentView, setCurrentView] = useState<'main' | 'bots'>('main');
  const [showVsHumanLocked, setShowVsHumanLocked] = useState(false);

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

      {showVsHumanLocked && (
        <Pressable style={styles.lockedOverlay} onPress={() => setShowVsHumanLocked(false)}>
          <View style={[styles.lockedCard, { backgroundColor: currentTheme.colors.surface }]}>
            <Text style={[styles.lockedText, { color: currentTheme.colors.text }]}>BEAT{'\n'}EASYBOT{'\n'}FIRST</Text>
          </View>
        </Pressable>
      )}
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
      <Text style={{ color }}> {label}</Text>
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
    padding: 8
  },
  backButtonText: {
    fontSize: 24,
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
    fontSize: 32,
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
    fontSize: 24,
    fontWeight: '900'
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  lockedCard: {
    padding: 24,
    borderRadius: 12
  },
  lockedText: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center'
  }
});
