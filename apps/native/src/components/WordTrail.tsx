/**
 * Ports apps/web's `components/game/WordTrail.tsx`. A real, self-inflicted
 * gap in the port plan (see docs/project/REACT_NATIVE_PORT_PLAN.md's
 * "Phase 3.5" section) - listed as a Phase 2 component, deferred at the
 * end of that phase, then never re-mentioned in any of Phase 3's
 * otherwise-thorough per-slice "deferred" lists. Until this file existed,
 * InteractiveGame.tsx/ChallengeGame.tsx had no word trail at all, and
 * ZenGame.tsx only had a simplified stand-in.
 *
 * One deliberate layout simplification from web: web positions the
 * challenge-mode start/target word labels *absolutely, anchored to a
 * specific letter* (the first/last letter of the relevant trail entry -
 * see web's `renderWordWithStartWord`/`renderWordWithTargetWord`).
 * Native instead prepends/appends them as an inline "START →"/"← TARGET"
 * row segment - same information (which word is the actual start/target,
 * and which end of the trail they're closest to), a simpler layout
 * primitive, no loss of function.
 *
 * `showTurnNumbers`/`maxVisible` are accepted (matching web's prop
 * surface) but unused - web itself doesn't actually use them in its
 * current rendering (`void showTurnNumbers; void maxVisible;`), so this
 * isn't a native-specific omission.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export interface WordMoveScoreBreakdown {
  addLetterPoints: number;
  removeLetterPoints: number;
  movePoints: number;
  keyLetterUsagePoints: number;
}

export interface WordMove {
  word: string;
  score: number;
  player?: string;
  opponentName?: string;
  turnNumber?: number;
  keyLetters?: string[];
  scoreBreakdown?: WordMoveScoreBreakdown;
  /** When true, the word is rendered as dashes instead of its real
   * letters - the "ninja" gimmick (not currently wired up anywhere in
   * this port - see this file's doc comment). */
  maskWord?: boolean;
}

export interface WordTrailProps {
  words?: string[];
  moves?: WordMove[];
  showScores?: boolean;
  showTurnNumbers?: boolean;
  maxVisible?: number;
  onWordPress?: (word: string, index: number) => void;
  startWord?: string;
  targetWord?: string;
  isChallengeMode?: boolean;
}

interface DisplayItem {
  word: string;
  score: number;
  keyLetters: string[];
  scoreBreakdown?: WordMoveScoreBreakdown;
  maskWord: boolean;
}

const maskWordAsDashes = (word: string): string => '-'.repeat(word.length);

function formatScore(item: DisplayItem): string {
  if (item.score === 0) return 'pass';
  if (item.scoreBreakdown) {
    const base = item.scoreBreakdown.addLetterPoints + item.scoreBreakdown.removeLetterPoints + item.scoreBreakdown.movePoints;
    const keyBonus = item.scoreBreakdown.keyLetterUsagePoints;
    if (base > 0) return keyBonus > 0 ? `+${base} +${keyBonus}` : `+${base}`;
    if (keyBonus > 0) return `+${keyBonus}`;
    // Breakdown has no detail to show (e.g. a synced multiplayer turn only
    // carries the total earned score, not the add/remove/move/key split) -
    // fall back to the actual total instead of a misleading "+0".
    return `+${item.score}`;
  }
  return `+${item.score}`;
}

export const WordTrail: React.FC<WordTrailProps> = ({
  words = [],
  moves = [],
  showScores = false,
  onWordPress,
  startWord,
  targetWord,
  isChallengeMode = false
}) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  // Challenge mode never shows scores (it's scoreless by design - see
  // ChallengeGame.tsx, which never actually passes showScores=true for
  // this reason), enforced here rather than trusted to every caller.
  const effectiveShowScores = showScores && !isChallengeMode;

  const displayData: DisplayItem[] = moves.length > 0
    ? moves.map(move => ({
        word: move.word,
        score: move.score,
        keyLetters: move.keyLetters || [],
        scoreBreakdown: move.scoreBreakdown,
        maskWord: move.maskWord || false
      }))
    : words.map(word => ({ word, score: 0, keyLetters: [], maskWord: false }));

  const renderWord = (item: DisplayItem) => {
    const displayWord = item.maskWord ? maskWordAsDashes(item.word) : item.word;
    const letters = displayWord.toUpperCase().split('');
    return (
      <View style={styles.wordContainer}>
        {letters.map((letter, index) => {
          const isKeyLetter = !item.maskWord && item.keyLetters.includes(letter);
          return (
            <Text key={index} style={[styles.letter, { color: isKeyLetter ? colors.accent : colors.text }]}>
              {letter}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderRow = (item: DisplayItem, index: number, options: { showStart?: boolean; showTarget?: boolean } = {}) => {
    const content = (
      <>
        {options.showStart && startWord && (
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>START</Text>
            {renderWord({ word: startWord, score: 0, keyLetters: [], maskWord: false })}
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
          </View>
        )}
        {renderWord(item)}
        {options.showTarget && targetWord && (
          <View style={styles.labelRow}>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>←</Text>
            {renderWord({ word: targetWord, score: 0, keyLetters: [], maskWord: false })}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET</Text>
          </View>
        )}
      </>
    );

    return (
      <Pressable
        key={`${item.word}-${index}`}
        onPress={onWordPress ? () => onWordPress(item.word, index) : undefined}
        disabled={!onWordPress}
        accessibilityRole={onWordPress ? 'button' : 'text'}
        accessibilityLabel={`Word: ${item.word}${effectiveShowScores ? `, ${item.score} points` : ''}`}
        style={styles.row}
      >
        {/* The word is centered across the *full row width*, independent
            of whether a score is shown next to it - the score floats as
            an absolutely-positioned overlay at the right edge instead of
            a normal flex sibling, so its presence/width never shifts the
            word off-center (a flex-row sibling would shrink the space
            available to center within, pushing the word left). */}
        <View style={styles.rowContent}>{content}</View>
        {effectiveShowScores && (
          <Text style={[styles.score, { color: colors.textSecondary }]}>{formatScore(item)}</Text>
        )}
      </Pressable>
    );
  };

  if (isChallengeMode && startWord && targetWord) {
    if (displayData.length === 0) {
      return (
        <View style={styles.container} accessibilityRole="text" accessibilityLabel="Challenge word trail">
          <View style={styles.emptyRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>START</Text>
            {renderWord({ word: startWord, score: 0, keyLetters: [], maskWord: false })}
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>←</Text>
            {renderWord({ word: targetWord, score: 0, keyLetters: [], maskWord: false })}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET</Text>
          </View>
        </View>
      );
    }

    const reversed = [...displayData].reverse();
    return (
      <View style={styles.container} accessibilityRole="text" accessibilityLabel="Challenge word trail">
        {reversed.map((item, index) => {
          const isFirstWord = index === reversed.length - 1;
          const isLastWord = index === 0;
          return renderRow(item, index, { showStart: isFirstWord, showTarget: isLastWord });
        })}
      </View>
    );
  }

  if (displayData.length === 0) return null;

  const reversed = [...displayData].reverse();
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="Game word history">
      {reversed.map((item, index) => renderRow(item, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 4
  },
  // Spans the full trail width (not shrink-wrapped to content) so
  // `rowContent`'s centering below is relative to the *row*, not to
  // whatever width the word+score happen to add up to - and `position:
  // relative` gives `score` (below) a positioning context to float
  // against without affecting this row's own layout/height.
  row: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  wordContainer: {
    flexDirection: 'row'
  },
  letter: {
    fontSize: 18,
    fontWeight: '900'
  },
  label: {
    fontSize: 10,
    fontWeight: '700'
  },
  arrow: {
    fontSize: 14,
    fontWeight: '700'
  },
  score: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -8 }],
    fontSize: 12,
    fontWeight: '700'
  }
});
