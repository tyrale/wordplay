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
 * `ThemeSwatch` below), mechanics toggles + round length selection, the
 * "bad word filter" toggle (backed by `VanityFilterContext`, not the
 * generic `MechanicsSettingsContext` - see its own comment on the
 * toggle row below for why), unlocked bots (tap to start a game with
 * that bot), all four "about" entries ("the basics"/"the game"/
 * "dictionaries"/"thoughts"), the "player-stats" permanent mechanic
 * (opens the real StatsOverlay), the "word-paths" permanent mechanic
 * (opens the real WordPathExplorer), the "unlock-counter" permanent
 * mechanic (shows "N/N unlocked" next to the themes/mechanics/bots
 * section headers once unlocked by playing "unlock" - matches web's
 * `showUnlockCounts` exactly), masked "????" locked-item previews (once
 * a category is "revealed" by playing its own name - "themes"/
 * "mechanics"/"bots" - see `lockedThemeItems`/`lockedMechanicItems`/
 * `lockedBotItems` below), reset-unlocks (debug), and home/resign.
 * Daily challenge + its leaderboard are reachable directly from
 * `MainScreen`'s "vs world" option, not from this Menu (matches web's
 * own MainScreen-level entry point, not a Menu one).
 * Deliberately deferred, not silently dropped: community stats - it
 * depends on a system not yet ported.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { useTheme, getEffectiveColors, darkenColor } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useMechanicsSettings } from '../contexts/MechanicsSettingsContext';
import { useVanityFilter } from '../contexts/VanityFilterContext';
import { useRoundLength, DEFAULT_ROUND_LENGTH } from '../contexts/RoundLengthContext';
import { useUnlockedThemes } from '../hooks/useUnlockedThemes';
import { getBotDisplayNamesMapping, getVisibleBots } from '@wordplay/engine/botRegistry';
import { availableThemes as ALL_THEMES } from '@wordplay/theme/theme';
import type { GameTheme } from '@wordplay/theme/theme';
import { DictionariesOverlay } from './DictionariesOverlay';
import { ThoughtsOverlay } from './ThoughtsOverlay';
import { TheGameOverlay } from './TheGameOverlay';
import { StatsOverlay } from './StatsOverlay';
import { WordPathExplorer } from './WordPathExplorer';

const ALL_MECHANIC_IDS = ['vanity-filter', '3-letter-start', '5-letter-start', '6-letter-start', '7-letter-start', '8-letter-start', '9-letter-start', '10-letter-start', 'time-pressure', 'gravity', 'drunk', 'round-length-10', 'round-length-15', 'round-length-30', 'round-length-40', 'round-length-50', 'round-length-100'];
const ROUND_LENGTH_MECHANIC_IDS = new Set(['round-length-10', 'round-length-15', 'round-length-30', 'round-length-40', 'round-length-50', 'round-length-100']);
const PERMANENT_MECHANIC_IDS = ['player-stats', 'word-paths', 'zen-mode', 'unlock-counter', 'community-stats'];
const DARK_MODE_MECHANIC_ID = 'dark-mode';
// Mechanic IDs that are available to every player from the start - no
// unlock word required, and not counted in the mechanics unlock progress
// (unlike ALL_MECHANIC_IDS). Still gated by the on/off toggle in
// MechanicsSettingsContext, just always shown regardless of unlock state.
const ALWAYS_AVAILABLE_MECHANIC_IDS = ['type-to-clear'];

const MECHANIC_DISPLAY_NAMES: Record<string, string> = {
  'vanity-filter': 'bad word filter',
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
  'community-stats': 'community stats',
  'type-to-clear': 'type to clear'
};

const getRoundLengthValue = (mechanicId: string): number => parseInt(mechanicId.replace('round-length-', ''), 10);

// Masks a display name into '?' characters (one per non-space
// character), preserving spaces as gaps - matches web's Menu.tsx exactly.
const maskName = (name: string): string => name.replace(/[^\s]/g, '?');

// Simple deterministic string hash, used to derive a stable "random"
// sort order for locked item previews so they don't just appear in
// alphabetical order, but also don't reshuffle on every re-render -
// matches web's Menu.tsx exactly.
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
};

// Shuffles items into a stable, non-alphabetical order based on a hash
// of each item's id - matches web's Menu.tsx exactly.
function shuffleLockedItems<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => hashString(a.id) - hashString(b.id));
}

const getMechanicTitle = (mechanicId: string): string => MECHANIC_DISPLAY_NAMES[mechanicId] || mechanicId;

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
  const colors = getEffectiveColors(currentTheme, isInverted);
  const { getUnlockedItems, resetUnlocksToFresh, isLoading } = useUnlockSystem();
  const { isMechanicOn, toggleMechanic } = useMechanicsSettings();
  const { isVanityFilterOn, toggleVanityFilter } = useVanityFilter();
  const { roundLength, setRoundLength } = useRoundLength();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isDictionariesOpen, setIsDictionariesOpen] = useState(false);
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isTheGameOpen, setIsTheGameOpen] = useState(false);
  const [isWordPathsOpen, setIsWordPathsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const unlockedThemeIds = getUnlockedItems('theme');
  const unlockedMechanics = getUnlockedItems('mechanic');
  const unlockedBots = getUnlockedItems('bot');
  const availableBots = isLoading ? ['basicBot'] : (unlockedBots.length > 0 ? unlockedBots : ['basicBot']);
  const unlockedThemes = useUnlockedThemes({ unlockedThemes: unlockedThemeIds });
  const botDisplayNames = getBotDisplayNamesMapping();

  const isDarkModeUnlocked = unlockedMechanics.includes(DARK_MODE_MECHANIC_ID);
  const toggleableMechanics = unlockedMechanics.filter(
    id => id !== DARK_MODE_MECHANIC_ID && !PERMANENT_MECHANIC_IDS.includes(id) && !ROUND_LENGTH_MECHANIC_IDS.has(id)
  );
  const unlockedRoundLengths = unlockedMechanics.filter(id => ROUND_LENGTH_MECHANIC_IDS.has(id));
  const unlockedPermanentMechanics = PERMANENT_MECHANIC_IDS.filter(id => unlockedMechanics.includes(id));
  const hasMechanicsSection = toggleableMechanics.length > 0 || unlockedRoundLengths.length > 0 || unlockedPermanentMechanics.length > 0 || ALWAYS_AVAILABLE_MECHANIC_IDS.length > 0;

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

  // Locked "????" previews for each category - only computed (and shown)
  // once that category has been "revealed" by playing its own name as a
  // word (see unlock-definitions.ts's reveal_themes/reveal_mechanics/
  // reveal_bots) - matches web's Menu.tsx `revealedCategories` gating
  // exactly, including the deterministic (not actually random) shuffle
  // so the list doesn't reshuffle on every re-render.
  const revealedCategories = getUnlockedItems('reveal');
  const lockedThemeItems = revealedCategories.includes('themes')
    ? shuffleLockedItems(
        ALL_THEMES
          .filter(theme => !unlockedThemes.some(unlocked => unlocked.name === theme.name))
          .map(theme => ({ id: `locked-theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}`, title: maskName(theme.name.toLowerCase()) }))
      )
    : [];
  const lockedMechanicItems = revealedCategories.includes('mechanics')
    ? shuffleLockedItems(
        ALL_MECHANIC_IDS
          .filter(mechanicId => !unlockedMechanics.includes(mechanicId))
          .map(mechanicId => ({ id: `locked-mechanic-${mechanicId}`, title: maskName(getMechanicTitle(mechanicId)) }))
      )
    : [];
  const lockedBotItems = revealedCategories.includes('bots')
    ? shuffleLockedItems(
        getVisibleBots()
          .filter(bot => !availableBots.includes(bot.id))
          .map(bot => ({ id: `locked-bot-${bot.id}`, title: maskName(botDisplayNames[bot.id] || bot.id) }))
      )
    : [];

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

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="none">
        <Pressable
          style={[styles.container, { backgroundColor: colors.background }]}
          onPress={e => e.stopPropagation()}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {isInGame && (
              <SectionHeader label="resign" color={'#DC2626'} onPress={handleResign} />
            )}

            <SectionHeader
              label="themes"
              color={colors.text}
              accentColor={colors.accent}
              count={showUnlockCounts ? themesCount : undefined}
              onPress={() => toggleSection('themes')}
            />
            {expandedSection === 'themes' && (
              <View style={styles.sectionBody}>
                {isDarkModeUnlocked && (
                  <ToggleRow label="dark mode" value={isInverted} onToggle={toggleInverted} textColor={colors.text} accentColor={colors.accent} />
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
                  {lockedThemeItems.map(item => (
                    <LockedSwatch key={item.id} title={item.title} textColor={colors.textSecondary} />
                  ))}
                </View>
              </View>
            )}

            {(hasMechanicsSection || lockedMechanicItems.length > 0) && (
              <>
                <SectionHeader
                  label="mechanics"
                  color={colors.text}
                  accentColor={colors.accent}
                  count={showUnlockCounts ? mechanicsCount : undefined}
                  onPress={() => toggleSection('mechanics')}
                />
                {expandedSection === 'mechanics' && (
                  <View style={styles.sectionBody}>
                    {unlockedPermanentMechanics.map(id => {
                      // "player-stats" opens the real StatsOverlay,
                      // "word-paths" opens the real WordPathExplorer (see
                      // below); the rest (zen-mode, unlock-counter,
                      // community-stats) have no on/off state and no
                      // wired action yet - see this file's header doc
                      // comment for what's still deferred.
                      if (id === 'player-stats') {
                        return (
                          <Pressable key={id} onPress={() => setIsStatsOpen(true)} style={styles.row} accessibilityRole="button">
                            <Text style={{ color: colors.text, fontWeight: '900' }}>{MECHANIC_DISPLAY_NAMES[id]}</Text>
                          </Pressable>
                        );
                      }
                      if (id === 'word-paths') {
                        return (
                          <Pressable key={id} onPress={() => setIsWordPathsOpen(true)} style={styles.row} accessibilityRole="button">
                            <Text style={{ color: colors.text, fontWeight: '900' }}>{MECHANIC_DISPLAY_NAMES[id]}</Text>
                          </Pressable>
                        );
                      }
                      return (
                        <View key={id} style={styles.row}>
                          <Text style={{ color: colors.text, fontWeight: '900' }}>{MECHANIC_DISPLAY_NAMES[id] || id} ✓</Text>
                        </View>
                      );
                    })}
                    {ALWAYS_AVAILABLE_MECHANIC_IDS.map(id => (
                      <ToggleRow
                        key={id}
                        label={MECHANIC_DISPLAY_NAMES[id] || id}
                        value={isMechanicOn(id)}
                        onToggle={() => toggleMechanic(id)}
                        textColor={colors.text}
                        accentColor={colors.accent}
                      />
                    ))}
                    {toggleableMechanics
                      .sort((a, b) => ALL_MECHANIC_IDS.indexOf(a) - ALL_MECHANIC_IDS.indexOf(b))
                      .map(id =>
                        // "bad word filter" is backed by VanityFilterContext,
                        // not MechanicsSettingsContext - it's the only
                        // mechanic whose on/off state needs to be read by
                        // non-Menu game components too (CurrentWord/
                        // WordTrail's word masking), so it lives in its own
                        // context rather than the generic mechanics one -
                        // matches web's Menu.tsx exactly (`isVanityFilterOn`/
                        // `toggleVanityFilter`, not `isMechanicOn`).
                        id === 'vanity-filter' ? (
                          <ToggleRow
                            key={id}
                            label={MECHANIC_DISPLAY_NAMES[id]}
                            value={isVanityFilterOn}
                            onToggle={toggleVanityFilter}
                            textColor={colors.text}
                            accentColor={colors.accent}
                          />
                        ) : (
                          <ToggleRow
                            key={id}
                            label={MECHANIC_DISPLAY_NAMES[id] || id}
                            value={isMechanicOn(id)}
                            onToggle={() => toggleMechanic(id)}
                            textColor={colors.text}
                            accentColor={colors.accent}
                          />
                        )
                      )}
                    {unlockedRoundLengths.map(id => (
                      <ToggleRow
                        key={id}
                        label={MECHANIC_DISPLAY_NAMES[id] || id}
                        value={getRoundLengthValue(id) === roundLength}
                        onToggle={() => handleRoundLengthSelect(id)}
                        textColor={colors.text}
                        accentColor={colors.accent}
                      />
                    ))}
                    {lockedMechanicItems.map(item => (
                      <View key={item.id} style={styles.row}>
                        <Text style={{ color: colors.textSecondary, fontWeight: '900' }}>{item.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <SectionHeader
              label="bots"
              color={colors.text}
              accentColor={colors.accent}
              count={showUnlockCounts ? botsCount : undefined}
              onPress={() => toggleSection('bots')}
            />
            {expandedSection === 'bots' && (
              <View style={styles.sectionBody}>
                {availableBots.map(botId => (
                  <Pressable key={botId} onPress={() => handleBotSelect(botId)} style={styles.row} accessibilityRole="button">
                    <Text style={{ color: colors.text, fontWeight: '900' }}>{botDisplayNames[botId] || botId}</Text>
                  </Pressable>
                ))}
                {lockedBotItems.map(item => (
                  <View key={item.id} style={styles.row}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '900' }}>{item.title}</Text>
                  </View>
                ))}
              </View>
            )}

            <SectionHeader label="about" color={colors.text} onPress={() => toggleSection('about')} />
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
                  <Text style={{ color: colors.text, fontWeight: '900' }}>the basics</Text>
                </Pressable>
                <Pressable onPress={() => setIsTheGameOpen(true)} style={styles.row} accessibilityRole="button">
                  <Text style={{ color: colors.text, fontWeight: '900' }}>the game</Text>
                </Pressable>
                <Pressable onPress={() => setIsDictionariesOpen(true)} style={styles.row} accessibilityRole="button">
                  <Text style={{ color: colors.text, fontWeight: '900' }}>dictionaries</Text>
                </Pressable>
                <Pressable onPress={() => setIsThoughtsOpen(true)} style={styles.row} accessibilityRole="button">
                  <Text style={{ color: colors.text, fontWeight: '900' }}>thoughts</Text>
                </Pressable>
                <Pressable onPress={resetUnlocksToFresh} style={styles.row} accessibilityRole="button">
                  <Text style={{ color: colors.textSecondary, fontWeight: '900' }}>reset unlocks (debug)</Text>
                </Pressable>
              </View>
            )}

            <SectionHeader label="home" color={colors.text} onPress={handleHome} />
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Shown on top of the Menu (it fully covers the menu visually), so
          closing it returns to the menu instead of home - matches web's
          usage exactly. */}
      <DictionariesOverlay isVisible={isDictionariesOpen} onClose={() => setIsDictionariesOpen(false)} />
      <ThoughtsOverlay isVisible={isThoughtsOpen} onClose={() => setIsThoughtsOpen(false)} />
      <TheGameOverlay isVisible={isTheGameOpen} onClose={() => setIsTheGameOpen(false)} />
      <StatsOverlay isVisible={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      <WordPathExplorer isVisible={isWordPathsOpen} onClose={() => setIsWordPathsOpen(false)} />
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

/**
 * A not-yet-unlocked theme's "????" preview - same box shape as
 * `ThemeSwatch` (same reason to previews grid-align together), but a
 * flat, non-interactive gray box since there's no real theme to draw
 * colors from - matches web's Menu.tsx comment on locked theme previews
 * exactly ("Locked previews have no theme colors to show - render as a
 * flat gray box").
 */
const LockedSwatch: React.FC<{ title: string; textColor: string }> = ({ title, textColor }) => (
  <View style={[styles.themeSwatch, styles.lockedSwatch]} accessibilityRole="text" accessibilityLabel="Locked, not yet unlocked">
    <Text style={[styles.themeSwatchName, { color: textColor }]}>{title}</Text>
  </View>
);

const TOGGLE_KNOB_TRAVEL = 18;

const ToggleRow: React.FC<{ label: string; value: boolean; onToggle: () => void; textColor: string; accentColor: string }> = ({
  label,
  value,
  onToggle,
  textColor,
  accentColor
}) => {
  // Native `Switch` can't be used here: on iOS its "off" track is a fixed
  // system white/light-gray fill - `trackColor.false` only tints a thin
  // border ring, not the fill itself - so no accent-derived color is ever
  // visible against a light theme's background. Instead this mirrors
  // web's own custom `.dark-mode-toggle` (Menu.css) exactly: a 40x20
  // pill track (full accent color when on, accent darkened 15% toward
  // black when off) with a 16x16 knob that slides between the two ends.
  const knobOffset = useRef(new Animated.Value(value ? TOGGLE_KNOB_TRAVEL : 0)).current;

  useEffect(() => {
    Animated.timing(knobOffset, {
      toValue: value ? TOGGLE_KNOB_TRAVEL : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  }, [value, knobOffset]);

  return (
    <View style={styles.toggleRow}>
      <Text style={{ color: textColor, fontWeight: '900' }}>{label}</Text>
      {/* RN doesn't reliably associate a bare toggle with an adjacent
          sibling `Text` for screen readers the way an HTML `<label>`
          does - an explicit accessibilityLabel/Role/State here is
          required, not just nice-to-have, so VoiceOver/TalkBack announce
          "dark mode switch, on" instead of just "switch". */}
      <Pressable
        onPress={onToggle}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        style={[styles.toggleTrack, { backgroundColor: value ? accentColor : darkenColor(accentColor, 0.15) }]}
      >
        <Animated.View
          style={[styles.toggleKnob, { backgroundColor: textColor, transform: [{ translateX: knobOffset }] }]}
        />
      </Pressable>
    </View>
  );
};

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
  // Right-justified throughout, matching web's Menu.css (`.menu-list`/
  // `.menu-tier1-item`/`.menu-tier2-item` are all `align-items: flex-end`/
  // `text-align: right`) - every row hugs the right edge of the sheet
  // instead of the left.
  scrollContent: {
    padding: 20,
    gap: 4,
    alignItems: 'flex-end'
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
  // Menu.css `.menu-tier1-item__count` (accent color, a small gap before
  // the label). Heaviest weight available (900) per this file's own
  // convention for numeric values a player has "earned" - same
  // reasoning as ScoreBar.tsx's score numbers.
  sectionHeaderCount: {
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8
  },
  sectionBody: {
    paddingBottom: 8,
    gap: 8,
    alignItems: 'flex-end'
  },
  row: {
    paddingVertical: 6
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6
  },
  // Matches web's `.dark-mode-toggle`/`.dark-mode-toggle__slider` (Menu.css) exactly.
  toggleTrack: {
    width: 40,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center'
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 2
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  lockedSwatch: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)'
  },
  themeSwatchName: {
    fontSize: 14,
    fontWeight: '900'
  },
  themeSwatchCheck: {
    fontSize: 14,
    fontWeight: '900'
  }
});
