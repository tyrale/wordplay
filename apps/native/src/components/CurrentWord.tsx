/**
 * Ports apps/web's `components/game/CurrentWord.tsx`. Since this Phase 2
 * slice's letter grid is tap-to-append rather than drag-to-position (see
 * AlphabetGrid.tsx's doc comment), this component also supports
 * tap-to-remove on its own letters when `onLetterPress` is provided - the
 * paired interaction that makes a fully tap-based word-editing flow
 * possible without drag-and-drop.
 *
 * Vanity filter integration (censoring profane words) is deferred along
 * with the rest of that system for this slice - always displays the raw
 * word.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LockIcon } from './LockIcon';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export interface LetterHighlight {
  index: number;
  type: 'key' | 'locked' | 'lockedKey';
}

export interface CurrentWordProps {
  word: string;
  highlights?: LetterHighlight[];
  /** If provided, tapping a letter calls this with its index (to remove it). */
  onLetterPress?: (index: number) => void;
}

export const CurrentWord: React.FC<CurrentWordProps> = ({ word, highlights = [], onLetterPress }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const letters = word.toUpperCase().split('');

  const highlightMap = highlights.reduce((acc, { index, type }) => {
    acc[index] = type;
    return acc;
  }, {} as Record<number, 'key' | 'locked' | 'lockedKey'>);

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Current word: ${word}`}
    >
      {letters.map((letter, index) => {
        const highlightType = highlightMap[index];
        const isLocked = highlightType === 'locked' || highlightType === 'lockedKey';
        const color = highlightType === 'key' || highlightType === 'lockedKey' ? colors.accent : colors.text;

        const letterEl = (
          <View key={index} style={styles.letterWrap}>
            <Text style={[styles.letter, { color }]}>{letter}</Text>
            {isLocked && (
              <View style={styles.lock} pointerEvents="none">
                <LockIcon size={10} color={colors.accent} />
              </View>
            )}
          </View>
        );

        // Locked letters can't be removed (mirrors the engine rule that
        // rejects removing a locked/lockedKey letter), so they're not
        // wrapped in a Pressable even when onLetterPress is provided.
        if (!onLetterPress || isLocked) return letterEl;

        return (
          <Pressable
            key={index}
            onPress={() => onLetterPress(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove letter ${letter}`}
          >
            {letterEl}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  letterWrap: {
    position: 'relative',
    marginHorizontal: 1
  },
  letter: {
    fontSize: 40,
    fontWeight: '900'
  },
  lock: {
    position: 'absolute',
    top: 2,
    right: -4
  }
});
