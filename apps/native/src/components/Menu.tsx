/**
 * Native settings Menu - a significantly scoped-down port of apps/web's
 * `components/ui/Menu.tsx`. That component is ~800 lines covering themes,
 * mechanics/round-length, a vanity (bad word) filter toggle, a "vs world"
 * section (daily challenge + leaderboard), bots, an "about" section with
 * four sub-overlays (dictionaries/thoughts/the-game/stats), masked
 * "????" locked-item previews, and a community "X/X found worldwide"
 * progress line.
 *
 * This slice ports: themes (+ dark mode toggle, previewed per-theme via
 * `ThemeSwatch` below), mechanics toggles + round length selection,
 * unlocked bots (tap to start a game with that bot), the "the basics"/
 * "dictionaries" about entries, the "player-stats" permanent mechanic
 * (opens the real StatsOverlay), the "unlock-counter" permanent mechanic
 * (shows "N/N unlocked" next to the themes/mechanics/bots section
 * headers once unlocked by playing "unlock" - matches web's
 * `showUnlockCounts` exactly), reset-unlocks (debug), and home/resign.
 * Deliberately deferred, not silently dropped:
 * the vanity filter system, "vs world"/leaderboard/challenge entries, two
 * of the four "about" sub-overlays (thoughts/the-game), the "word-paths"
 * permanent mechanic (WordPathExplorer), locked-item previews, and
 * community stats - each depends on a system not yet ported (challenge
 * mode, the vanity filter hook/context, the leaderboard overlay, word
 * path graph tracking) or was cut for scope in this pass.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useMechanicsSettings } from '../contexts/MechanicsSettingsContext';
import { useRoundLength, DEFAULT_ROUND_LENGTH } from '../contexts/RoundLengthContext';
import { useUnlockedThemes } from '../hooks/useUnlockedThemes';
import { getBotDisplayNamesMapping, getVisibleBots } from '@wordplay/engine/botRegistry';
import { availableThemes as ALL_THEMES } from '@wordplay/theme/theme';
import type { GameTheme } from '@wordplay/theme/theme';
import { DictionariesOverlay } from './DictionariesOverlay';
import { StatsOverlay } from './StatsOverlay';

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
  onStartGame?: (gameType: 'bot' | 'tutorial', botId: string) => void;
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
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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

  // "N/N unlocked" counts next to the themes/mechanics/bots section
  // headers, shown only once the player has unlocked the "unlock
  // counter" mechanic by playing the word "unlock" - matches web's
  // Menu.tsx exactly (showUnlockCounts + each tier1Item.count).
  const showUnlockCounts = unlockedMechanics.includes('unlock-counter');
  const themesCount = { unlocked: unlockedThemes.length, total: ALL_THEMES.length };
  const mechanicsCount = {
    unlocked: unlockedMechanics.filter(id => id !== DARK_MODE_MECHANIC_ID).length,
    total: ALL_MECHANIC_IDS.length + PERMANENT_MECHANIC_IDS.length
  };
  const botsCount = { unlocked: availableBots.length, total: getVisibleBots().length };

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

            <SectionHeader
              label="themes"
              color={currentTheme.colors.text}
              accentColor={currentTheme.colors.accent}
              count={showUnlockCounts ? themesCount : undefined}
              onPress={() => toggleSection('themes')}
            />
            {expandedSection === 'themes' && (
              <View style={styles.sectionBody}>
                {isDarkModeUnlocked && (
                  <ToggleRow label="dark mode" value={isInverted} onToggle={toggleInverted} textColor={currentTheme.colors.text} accentColor={currentTheme.colors.accent} />
                )}
                <View style={styles.themesGrid}>
                  {unlockedThemes.map(theme => (
                    <ThemeSwatch
                      key={theme.name}
                      theme={theme}
                      isSelected={theme.name === currentTheme.name}
                      onPress={() => handleThemeSelect(theme)}
                    />
                  ))}
                </View>
              </View>
            )}

            {hasMechanicsSection && (
              <>
                <SectionHeader
                  label="mechanics"
                  color={currentTheme.colors.text}
                  accentColor={currentTheme.colors.accent}
                  count={showUnlockCounts ? mechanicsCount : undefined}
                  onPress={() => toggleSection('mechanics')}
                />
                {expandedSection === 'mechanics' && (
                  <View style={styles.sectionBody}>
                    {unlockedPermanentMechanics.map(id => {
                      // "player-stats" opens the real StatsOverlay (see
                      // below); the rest (word-paths, zen-mode,
                      // unlock-counter, community-stats) have no on/off
                      // state and no wired action yet - see this file's
                      // header doc comment for what's still deferred.
                      if (id === 'player-stats') {
                        return (
                          <Pressable key={id} onPress={() => setIsStatsOpen(true)} style={styles.row} accessibilityRole="button">
                            <Text style={{ color: currentTheme.colors.text }}>{MECHANIC_DISPLAY_NAMES[id]}</Text>
                          </Pressable>
                        );
                      }
                      return (
                        <View key={id} style={styles.row}>
                          <Text style={{ color: currentTheme.colors.text }}>{MECHANIC_DISPLAY_NAMES[id] || id} ✓</Text>
                        </View>
                      );
                    })}
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
                    {unlockedRoundLengths.map(id => {
                      const isSelected = getRoundLengthValue(id) === roundLength;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => handleRoundLengthSelect(id)}
                          style={styles.row}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text style={{ color: isSelected ? currentTheme.colors.accent : currentTheme.colors.text, fontWeight: isSelected ? '900' : '400' }}>
                            {MECHANIC_DISPLAY_NAMES[id] || id}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <SectionHeader
              label="bots"
              color={currentTheme.colors.text}
              accentColor={currentTheme.colors.accent}
              count={showUnlockCounts ? botsCount : undefined}
              onPress={() => toggleSection('bots')}
            />
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
                <Pressable
                  onPress={() => {
                    // Force-replay the tutorial on a fresh basicBot game -
                    // matches web's "the basics" entry (beginTutorialGame).
                    onStartGame?.('tutorial', 'basicBot');
                    onClose();
                  }}
                  style={styles.row}
                  accessibilityRole="button"
                >
                  <Text style={{ color: currentTheme.colors.text }}>the basics</Text>
                </Pressable>
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
      <StatsOverlay isVisible={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
    </Modal>
  );
};

const SectionHeader: React.FC<{ label: string; color: string; accentColor?: string; count?: { unlocked: number; total: number }; onPress: () => void }> = ({
  label,
  color,
  accentColor,
  count,
  onPress
}) => (
  <Pressable onPress={onPress} style={[styles.sectionHeader, styles.sectionHeaderRow]} accessibilityRole="button">
    {count && (
      <Text style={[styles.sectionHeaderCount, { color: accentColor ?? color }]}>
        {count.unlocked}/{count.total}
      </Text>
    )}
    <Text style={[styles.sectionHeaderText, { color }]}>{label}</Text>
  </Pressable>
);

/**
 * Deterministically picks one letter of a theme's name to highlight in
 * its own accent color - "random" in the sense of not simply always
 * being the first/last letter, but stable across re-renders (a hash of
 * the name, not `Math.random()`) so it doesn't visually jitter every
 * time the Menu re-renders. Matches web's Menu.tsx `renderThemeName`
 * (same hash-of-char-codes approach), just without its dark-mode-
 * inversion swap - see this file's ThemeSwatch doc comment for why.
 */
function getAccentLetterIndex(name: string): number {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % name.length;
}

/**
 * A theme's own row in the Menu's "themes" section, styled as a preview
 * of the theme itself rather than plain text: a filled (no border) box
 * using the theme's own background color, its name in the theme's own
 * text color, and one letter of the name highlighted in the theme's own
 * accent color - so picking a theme also previews what it'll actually
 * look like, matching web's Menu.tsx theme grid intent (ported without
 * its `isInverted` background/text swap - the rest of this file doesn't
 * apply that swap to any of its other rows either, so doing it only here
 * would be an inconsistency this port doesn't already have).
 */
const ThemeSwatch: React.FC<{ theme: GameTheme; isSelected: boolean; onPress: () => void }> = ({ theme, isSelected, onPress }) => {
  const name = theme.name.toLowerCase();
  const accentLetterIndex = useMemo(() => getAccentLetterIndex(name), [name]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.themeSwatch, { backgroundColor: theme.colors.background }]}
      accessibilityRole="button"
      // The selected theme is otherwise only distinguished by the small
      // checkmark below - not reliably perceivable via a screen reader,
      // so its selected state needs to be conveyed explicitly here too.
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${name} theme${isSelected ? ', selected' : ''}`}
    >
      <Text style={styles.themeSwatchName}>
        {name.split('').map((letter, index) => (
          <Text key={index} style={{ color: index === accentLetterIndex ? theme.colors.accent : theme.colors.text }}>
            {letter}
          </Text>
        ))}
      </Text>
      {isSelected && <Text style={[styles.themeSwatchCheck, { color: theme.colors.accent }]}>✓</Text>}
    </Pressable>
  );
};

const ToggleRow: React.FC<{ label: string; value: boolean; onToggle: () => void; textColor: string; accentColor: string }> = ({
  label,
  value,
  onToggle,
  textColor,
  accentColor
}) => (
  <View style={styles.toggleRow}>
    <Text style={{ color: textColor }}>{label}</Text>
    {/* RN doesn't reliably associate a bare `Switch` with an adjacent
        sibling `Text` for screen readers the way an HTML `<label>`
        does - an explicit accessibilityLabel/Role/State here is
        required, not just nice-to-have, so VoiceOver/TalkBack announce
        "dark mode switch, on" instead of just "switch". */}
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ true: accentColor }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    />
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '900'
  },
  // "N/N unlocked" count shown before the section label - matches web's
  // Menu.css `.menu-tier1-item__count` (accent color, smaller than the
  // label, a small gap before it).
  sectionHeaderCount: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8
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
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  // No border - the theme's own background fill is the entire preview,
  // matching this file's ThemeSwatch doc comment.
  themeSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  themeSwatchName: {
    fontSize: 14,
    fontWeight: '700'
  },
  themeSwatchCheck: {
    fontSize: 14,
    fontWeight: '900'
  }
});
