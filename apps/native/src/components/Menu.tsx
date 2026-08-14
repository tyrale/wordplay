/**
 * Native settings Menu - a significantly scoped-down port of apps/web's
 * `components/ui/Menu.tsx`. That component is ~800 lines covering themes,
 * mechanics/round-length, a vanity (bad word) filter toggle, a "vs world"
 * section (daily challenge + leaderboard), bots, an "about" section with
 * four sub-overlays (dictionaries/thoughts/the-game/stats), masked
 * "????" locked-item previews, and a community "X/X found worldwide"
 * progress line.
 *
 * This slice ports: themes (+ dark mode toggle), mechanics toggles +
 * round length selection, unlocked bots (tap to start a game with that
 * bot), the "dictionaries" about entry, reset-unlocks (debug), and
 * home/resign. Deliberately deferred, not silently dropped: the vanity
 * filter system, "vs world"/leaderboard/challenge entries, the other
 * three "about" sub-overlays (thoughts/the-game/stats), locked-item
 * previews, and community stats - each depends on a system not yet
 * ported (challenge mode, the vanity filter hook/context, stats/
 * leaderboard overlays) or was cut for scope in this pass.
 */
import React, { useCallback, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useMechanicsSettings } from '../contexts/MechanicsSettingsContext';
import { useRoundLength, DEFAULT_ROUND_LENGTH } from '../contexts/RoundLengthContext';
import { useUnlockedThemes } from '../hooks/useUnlockedThemes';
import { getBotDisplayNamesMapping } from '@wordplay/engine/botRegistry';
import type { GameTheme } from '@wordplay/theme/theme';
import { DictionariesOverlay } from './DictionariesOverlay';

const ALL_MECHANIC_IDS = ['3-letter-start', '5-letter-start', '6-letter-start', '7-letter-start', '8-letter-start', '9-letter-start', '10-letter-start', 'time-pressure', 'gravity', 'drunk', 'round-length-10', 'round-length-15', 'round-length-30', 'round-length-40', 'round-length-50', 'round-length-100'];
const ROUND_LENGTH_MECHANIC_IDS = new Set(['round-length-10', 'round-length-15', 'round-length-30', 'round-length-40', 'round-length-50', 'round-length-100']);
const PERMANENT_MECHANIC_IDS = ['player-stats', 'word-paths', 'zen-mode', 'unlock-counter', 'community-stats'];
const DARK_MODE_MECHANIC_ID = 'dark-mode';

const MECHANIC_DISPLAY_NAMES: Record<string, string> = {
  '3-letter-start': '3 letters start',
  '5-letter-start': '5 letters start',
  '6-letter-start': '6 letters start',
  '7-letter-start': '7 letters start',
  '8-letter-start': '8 letters start',
  '9-letter-start': '9 letters start',
  '10-letter-start': '10 letters start',
  'time-pressure': 'timer',
  gravity: 'gravity',
  drunk: 'drunk mode',
  'round-length-10': '10 rounds',
  'round-length-15': '15 rounds',
  'round-length-30': '30 rounds',
  'round-length-40': '40 rounds',
  'round-length-50': '50 rounds',
  'round-length-100': '100 rounds',
  'player-stats': 'stats',
  'word-paths': 'paths',
  'zen-mode': 'zen mode',
  'unlock-counter': 'unlock counter',
  'community-stats': 'community stats'
};

const getRoundLengthValue = (mechanicId: string): number => parseInt(mechanicId.replace('round-length-', ''), 10);

export interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame?: (gameType: 'bot', botId: string) => void;
  onNavigateHome?: () => void;
  onResign?: () => void;
  isInGame?: boolean;
}

export const Menu: React.FC<MenuProps> = ({ isOpen, onClose, onStartGame, onNavigateHome, onResign, isInGame = false }) => {
  const { currentTheme, setTheme, isInverted, toggleInverted } = useTheme();
  const { getUnlockedItems, resetUnlocksToFresh, isLoading } = useUnlockSystem();
  const { isMechanicOn, toggleMechanic } = useMechanicsSettings();
  const { roundLength, setRoundLength } = useRoundLength();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isDictionariesOpen, setIsDictionariesOpen] = useState(false);

  const unlockedThemeIds = getUnlockedItems('theme');
  const unlockedMechanics = getUnlockedItems('mechanic');
  const unlockedBots = getUnlockedItems('bot');
  const availableBots = isLoading ? ['basicBot'] : (unlockedBots.length > 0 ? unlockedBots : ['basicBot']);
  const unlockedThemes = useUnlockedThemes({ unlockedThemes: unlockedThemeIds });

  const isDarkModeUnlocked = unlockedMechanics.includes(DARK_MODE_MECHANIC_ID);
  const toggleableMechanics = unlockedMechanics.filter(
    id => id !== DARK_MODE_MECHANIC_ID && !PERMANENT_MECHANIC_IDS.includes(id) && !ROUND_LENGTH_MECHANIC_IDS.has(id)
  );
  const unlockedRoundLengths = unlockedMechanics.filter(id => ROUND_LENGTH_MECHANIC_IDS.has(id));
  const unlockedPermanentMechanics = PERMANENT_MECHANIC_IDS.filter(id => unlockedMechanics.includes(id));
  const hasMechanicsSection = toggleableMechanics.length > 0 || unlockedRoundLengths.length > 0 || unlockedPermanentMechanics.length > 0;

  const toggleSection = useCallback((section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
  }, []);

  const handleThemeSelect = useCallback((theme: GameTheme) => {
    setTheme(theme);
  }, [setTheme]);

  const handleRoundLengthSelect = useCallback((mechanicId: string) => {
    const value = getRoundLengthValue(mechanicId);
    setRoundLength(roundLength === value ? DEFAULT_ROUND_LENGTH : value);
  }, [roundLength, setRoundLength]);

  const handleBotSelect = useCallback((botId: string) => {
    onStartGame?.('bot', botId);
    onClose();
  }, [onStartGame, onClose]);

  const handleHome = useCallback(() => {
    onNavigateHome?.();
    onClose();
  }, [onNavigateHome, onClose]);

  const handleResign = useCallback(() => {
    onResign?.();
    onClose();
  }, [onResign, onClose]);

  const botDisplayNames = getBotDisplayNamesMapping();

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="none">
        <Pressable
          style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
          onPress={e => e.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {isInGame && (
              <SectionHeader label="resign" color={'#DC2626'} onPress={handleResign} />
            )}

            <SectionHeader label="themes" color={currentTheme.colors.text} onPress={() => toggleSection('themes')} />
            {expandedSection === 'themes' && (
              <View style={styles.sectionBody}>
                {isDarkModeUnlocked && (
                  <ToggleRow label="dark mode" value={isInverted} onToggle={toggleInverted} textColor={currentTheme.colors.text} accentColor={currentTheme.colors.accent} />
                )}
                {unlockedThemes.map(theme => (
                  <Pressable
                    key={theme.name}
                    onPress={() => handleThemeSelect(theme)}
                    style={styles.row}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: theme.name === currentTheme.name ? currentTheme.colors.accent : currentTheme.colors.text, fontWeight: theme.name === currentTheme.name ? '900' : '400' }}>
                      {theme.name.toLowerCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {hasMechanicsSection && (
              <>
                <SectionHeader label="mechanics" color={currentTheme.colors.text} onPress={() => toggleSection('mechanics')} />
                {expandedSection === 'mechanics' && (
                  <View style={styles.sectionBody}>
                    {unlockedPermanentMechanics.map(id => (
                      <View key={id} style={styles.row}>
                        <Text style={{ color: currentTheme.colors.text }}>{MECHANIC_DISPLAY_NAMES[id] || id} ✓</Text>
                      </View>
                    ))}
                    {toggleableMechanics
                      .sort((a, b) => ALL_MECHANIC_IDS.indexOf(a) - ALL_MECHANIC_IDS.indexOf(b))
                      .map(id => (
                        <ToggleRow
                          key={id}
                          label={MECHANIC_DISPLAY_NAMES[id] || id}
                          value={isMechanicOn(id)}
                          onToggle={() => toggleMechanic(id)}
                          textColor={currentTheme.colors.text}
                          accentColor={currentTheme.colors.accent}
                        />
                      ))}
                    {unlockedRoundLengths.map(id => (
                      <Pressable key={id} onPress={() => handleRoundLengthSelect(id)} style={styles.row} accessibilityRole="button">
                        <Text style={{ color: getRoundLengthValue(id) === roundLength ? currentTheme.colors.accent : currentTheme.colors.text, fontWeight: getRoundLengthValue(id) === roundLength ? '900' : '400' }}>
                          {MECHANIC_DISPLAY_NAMES[id] || id}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            <SectionHeader label="bots" color={currentTheme.colors.text} onPress={() => toggleSection('bots')} />
            {expandedSection === 'bots' && (
              <View style={styles.sectionBody}>
                {availableBots.map(botId => (
                  <Pressable key={botId} onPress={() => handleBotSelect(botId)} style={styles.row} accessibilityRole="button">
                    <Text style={{ color: currentTheme.colors.text }}>{botDisplayNames[botId] || botId}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <SectionHeader label="about" color={currentTheme.colors.text} onPress={() => toggleSection('about')} />
            {expandedSection === 'about' && (
              <View style={styles.sectionBody}>
                <Pressable onPress={() => setIsDictionariesOpen(true)} style={styles.row} accessibilityRole="button">
                  <Text style={{ color: currentTheme.colors.text }}>dictionaries</Text>
                </Pressable>
                <Pressable onPress={resetUnlocksToFresh} style={styles.row} accessibilityRole="button">
                  <Text style={{ color: currentTheme.colors.textSecondary }}>reset unlocks (debug)</Text>
                </Pressable>
              </View>
            )}

            <SectionHeader label="home" color={currentTheme.colors.text} onPress={handleHome} />
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Shown on top of the Menu (it fully covers the menu visually), so
          closing it returns to the menu instead of home - matches web's
          usage exactly. */}
      <DictionariesOverlay isVisible={isDictionariesOpen} onClose={() => setIsDictionariesOpen(false)} />
    </Modal>
  );
};

const SectionHeader: React.FC<{ label: string; color: string; onPress: () => void }> = ({ label, color, onPress }) => (
  <Pressable onPress={onPress} style={styles.sectionHeader} accessibilityRole="button">
    <Text style={[styles.sectionHeaderText, { color }]}>{label}</Text>
  </Pressable>
);

const ToggleRow: React.FC<{ label: string; value: boolean; onToggle: () => void; textColor: string; accentColor: string }> = ({
  label,
  value,
  onToggle,
  textColor,
  accentColor
}) => (
  <View style={styles.toggleRow}>
    <Text style={{ color: textColor }}>{label}</Text>
    <Switch value={value} onValueChange={onToggle} trackColor={{ true: accentColor }} />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  scrollContent: {
    padding: 20,
    gap: 4
  },
  sectionHeader: {
    paddingVertical: 12
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '900'
  },
  sectionBody: {
    paddingLeft: 12,
    paddingBottom: 8,
    gap: 8
  },
  row: {
    paddingVertical: 6
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  }
});
