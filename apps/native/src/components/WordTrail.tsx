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
 * Native instead floats them entirely outside the played word - "START →"
 * to its left, "← TARGET" to its right - the same technique (and the
 * same reasoning) as the regular-mode score float below: the played word
 * itself stays centered exactly like the vs-bot trail, and the label is
 * an absolutely-positioned overlay anchored to the word's own edge that
 * can never affect that centering, rather than a normal flex sibling
 * that would compete with the word for space and center the *group*
 * instead of the word itself.
 *
 * `showTurnNumbers`/`maxVisible` are accepted (matching web's prop
 * surface) but unused - web itself doesn't actually use them in its
 * current rendering (`void showTurnNumbers; void maxVisible;`), so this
 * isn't a native-specific omission.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { useVanityFilter } from '../contexts/VanityFilterContext';

type GetDisplayWord = (word: string, options?: { isEditing?: boolean }) => string;

type EffectiveColors = ReturnType<typeof getEffectiveColors>;

/** Placeholder glyph width (the word trail's letters are a fixed, bold
 * 18px uppercase) used only until `onLayout` reports the real measured
 * word width - see `WordRow`'s doc comment below for why this matters. */
const AVERAGE_LETTER_WIDTH = 13;

/** How tall the trail can grow (as a fraction of window height) before it
 * starts scrolling instead of pushing the rest of the board around -
 * matches web's own fixed-height-then-scroll behavior (`.word-trail__
 * played-words`'s `max-height: 40dvh`). A proportion of the actual screen
 * rather than a small fixed pixel constant, so the cut-off edge uses a
 * meaningful chunk of real available space instead of an arbitrarily
 * cramped window. */
const DEFAULT_MAX_HEIGHT_RATIO = 0.35;

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
  /** Caps how tall the trail can grow before scrolling kicks in.
   * Defaults to `DEFAULT_MAX_HEIGHT_RATIO` of the window's height. */
  maxHeight?: number;
}

interface DisplayItem {
  word: string;
  score: number;
  keyLetters: string[];
  scoreBreakdown?: WordMoveScoreBreakdown;
  maskWord: boolean;
}

const maskWordAsDashes = (word: string): string => '-'.repeat(word.length);

function renderWord(item: DisplayItem, colors: EffectiveColors, getDisplayWord: GetDisplayWord) {
  // Ninja mask (dashes) takes precedence over the vanity filter - a
  // masked word is never shown at all, censored or not. Otherwise apply
  // the normal vanity filtering - completed words in the trail are not
  // being edited - matches web's WordTrail.tsx renderWordWithHighlights.
  const displayWord = item.maskWord ? maskWordAsDashes(item.word) : getDisplayWord(item.word, { isEditing: false });
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
}

interface WordRowProps {
  item: DisplayItem;
  colors: EffectiveColors;
  onPress?: () => void;
  showStart?: boolean;
  showTarget?: boolean;
  startWord?: string;
  targetWord?: string;
  effectiveShowScores: boolean;
  getDisplayWord: GetDisplayWord;
}

/** One played-word row, floating its score (and, in challenge mode, its
 * start/target labels) off the word's own left/right edge without
 * disturbing the word's centering - see this file's doc comment for why
 * that's an absolutely-positioned overlay rather than a normal flex
 * sibling.
 *
 * That overlay's offset is a *measured pixel* value (via `onLayout` on
 * the word itself), not the simpler `left: '100%'`/`right: '100%'` this
 * used to be: `rowContent` below is deliberately left auto-width
 * (shrink-wrapped to the word, not given an explicit number), and RN's
 * native layout engine (Yoga) only resolves a percentage `left`/`right`
 * on an absolutely-positioned child when the positioned ancestor's own
 * dimension is explicitly set, not one it only ends up with via content-
 * based sizing - so on-device that percentage silently failed to
 * resolve, leaving the score positioned with an effective offset of 0
 * (invisible, collapsed behind the word) even though it rendered
 * correctly in the web preview (react-native-web maps the very same
 * style straight to real CSS, which has no such restriction). */
const WordRow: React.FC<WordRowProps> = ({
  item,
  colors,
  onPress,
  showStart,
  showTarget,
  startWord,
  targetWord,
  effectiveShowScores,
  getDisplayWord
}) => {
  const [measuredWordWidth, setMeasuredWordWidth] = useState<number | null>(null);
  const handleWordLayout = (e: LayoutChangeEvent) => setMeasuredWordWidth(e.nativeEvent.layout.width);
  // Reasonable placeholder for the one frame before onLayout reports the
  // real width, so the score/labels don't visibly pop in a frame late.
  const wordWidth = measuredWordWidth ?? item.word.length * AVERAGE_LETTER_WIDTH;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Word: ${item.word}${effectiveShowScores ? `, ${item.score} points` : ''}`}
      style={styles.row}
    >
      {/* `rowContent` is centered across the *full row width* (shrink-
          wrapped to exactly the played word's own rendered width),
          independent of whether a score or start/target label is
          shown - `position: relative` gives those a positioning
          context anchored to the WORD itself, not the row, so as
          absolutely-positioned overlays they can never re-shift the
          word's own centering the way a normal flex sibling would. */}
      <View style={styles.rowContent}>
        <View onLayout={handleWordLayout}>{renderWord(item, colors, getDisplayWord)}</View>
        {showStart && startWord && (
          <View testID="word-trail-start-label" style={[styles.floatingLabel, styles.floatingLabelLeft, { right: wordWidth }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>START</Text>
            {renderWord({ word: startWord, score: 0, keyLetters: [], maskWord: false }, colors, getDisplayWord)}
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
          </View>
        )}
        {showTarget && targetWord && (
          <View testID="word-trail-target-label" style={[styles.floatingLabel, styles.floatingLabelRight, { left: wordWidth }]}>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>←</Text>
            {renderWord({ word: targetWord, score: 0, keyLetters: [], maskWord: false }, colors, getDisplayWord)}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET</Text>
          </View>
        )}
        {effectiveShowScores && (
          <Text style={[styles.score, { color: colors.textSecondary, left: wordWidth }]}>{formatScore(item)}</Text>
        )}
      </View>
    </Pressable>
  );
};

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
  isChallengeMode = false,
  maxHeight
}) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const { getDisplayWord } = useVanityFilter();
  const { height: windowHeight } = useWindowDimensions();
  const effectiveMaxHeight = maxHeight ?? Math.round(windowHeight * DEFAULT_MAX_HEIGHT_RATIO);
  const scrollRef = useRef<ScrollView>(null);
  // The bottom of the trail (the most recently played word, right above
  // the current word in play) is a fixed floor that must never scroll
  // away - scrolling only ever reveals *older* words further up, the
  // same way a chat log stays pinned to its latest message. Scrolled to
  // the bottom on mount and again whenever the trail grows, so the floor
  // is always where the view rests by default. Not animated: an animated
  // scroll on every single new row reads as jumpy rather than smooth for
  // a list that's typically only gaining one row at a time.
  const scrollToFloor = () => scrollRef.current?.scrollToEnd({ animated: false });
  useEffect(() => {
    scrollToFloor();
  }, []);

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

  const renderRow = (item: DisplayItem, index: number, options: { showStart?: boolean; showTarget?: boolean } = {}) => (
    <WordRow
      key={`${item.word}-${index}`}
      item={item}
      colors={colors}
      onPress={onWordPress ? () => onWordPress(item.word, index) : undefined}
      showStart={options.showStart}
      showTarget={options.showTarget}
      startWord={startWord}
      targetWord={targetWord}
      effectiveShowScores={effectiveShowScores}
      getDisplayWord={getDisplayWord}
    />
  );

  if (isChallengeMode && startWord && targetWord) {
    if (displayData.length === 0) {
      return (
        <View style={styles.container} accessibilityRole="text" accessibilityLabel="Challenge word trail">
          <View style={styles.emptyRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>START</Text>
            {renderWord({ word: startWord, score: 0, keyLetters: [], maskWord: false }, colors, getDisplayWord)}
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>←</Text>
            {renderWord({ word: targetWord, score: 0, keyLetters: [], maskWord: false }, colors, getDisplayWord)}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TARGET</Text>
          </View>
        </View>
      );
    }

    // Chronological order (oldest first) renders oldest-at-top,
    // newest-at-bottom in a plain column layout - the most recently
    // played word should sit closest to the board/current word below it,
    // not scroll away to the top. Once that exceeds `effectiveMaxHeight`,
    // it scrolls (scrollbar hidden, matching web's `scrollbar-width:
    // none`) rather than growing the board layout around it.
    return (
      <ScrollView
        ref={scrollRef}
        style={[styles.scrollContainer, { maxHeight: effectiveMaxHeight }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToFloor}
        accessibilityRole="text"
        accessibilityLabel="Challenge word trail"
      >
        {displayData.map((item, index) => {
          const isFirstWord = index === 0;
          const isLastWord = index === displayData.length - 1;
          return renderRow(item, index, { showStart: isFirstWord, showTarget: isLastWord });
        })}
      </ScrollView>
    );
  }

  if (displayData.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.scrollContainer, { maxHeight: effectiveMaxHeight }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={scrollToFloor}
      accessibilityRole="text"
      accessibilityLabel="Game word history"
    >
      {displayData.map((item, index) => renderRow(item, index))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    width: '100%'
  },
  // `flexGrow: 1` + `justifyContent: 'flex-end'` (used as the ScrollView's
  // `contentContainerStyle`) bottom-aligns short content against the
  // floor (the current word below it) instead of leaving it stranded at
  // the top with empty space beneath - the same "fill from bottom up"
  // intent as web's `.word-trail__container { justify-content: flex-
  // start }` combined with its `column-reverse` direction.
  container: {
    width: '100%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4
  },
  // Spans the full trail width (not shrink-wrapped to content) purely so
  // `justifyContent: 'center'` below centers `rowContent` across the
  // *whole row*, not just whatever narrower width the row itself would
  // otherwise shrink-wrap to.
  row: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24
  },
  // Shrink-wrapped to exactly the word's own rendered width (score is
  // absolutely positioned, so it doesn't count towards this). `position:
  // relative` gives `score` a positioning context anchored to the word
  // itself rather than the row.
  rowContent: {
    position: 'relative',
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
  // Challenge mode's start/target labels - same floating technique as
  // `score` below, just on either side instead of only the right, and
  // wide enough to fit "START <word> →"/"← <word> TARGET" without
  // wrapping (score only ever needs to fit a short "+N").
  floatingLabel: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -9 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 160
  },
  // Anchored to the word's own left edge - `right` is set inline (the
  // word's measured pixel width, so its right edge lands flush there;
  // see `WordRow`'s doc comment for why this isn't a plain `right:
  // '100%'`), right-aligned within its own width so its content hugs
  // that edge instead of floating away from the word with empty space
  // in between.
  floatingLabelLeft: {
    marginRight: 8,
    justifyContent: 'flex-end'
  },
  // Mirrors `score`'s positioning exactly (`left` set inline to the
  // word's measured pixel width, off the word's own right edge), just
  // with more content.
  floatingLabelRight: {
    marginLeft: 8,
    justifyContent: 'flex-start'
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
  // `left` is set inline (the word's measured pixel width - see
  // `WordRow`'s doc comment) so this floats immediately past the word's
  // own right edge wherever it's centered, rather than pinned to the far
  // right of the trail. Heaviest weight available (900) - a player's
  // actual earned score value, same treatment as ScoreBar.tsx's score
  // numbers.
  score: {
    position: 'absolute',
    marginLeft: 8,
    top: '50%',
    transform: [{ translateY: -8 }],
    fontSize: 12,
    fontWeight: '900',
    // Prevents the score from ever line-wrapping onto a second line.
    width: 100
  }
});
