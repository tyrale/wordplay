/**
 * Ports apps/web's `components/game/CurrentWord.tsx` + the reordering
 * half of `components/game/WordBuilder.tsx` (the append-a-new-letter
 * half lives in the screen that owns both this component and
 * AlphabetGrid - see AlphabetGrid.tsx's/GridCell.tsx's doc comments).
 *
 * Tapping a letter still removes it (paired with tapping a grid letter
 * to append it), but each letter can now also be dragged to a new
 * position within the word - mirroring web's drag-to-reorder gesture,
 * using core `Animated`/`PanResponder` (no extra native dependency):
 * while dragging, a pulsing accent-colored "|" drop indicator shows
 * where the letter would land, and the other letters shift aside
 * (translateX) to open a gap for it.
 *
 * This went through several broken versions before this one - each of
 * the following is a real bug that was actually hit, not a hypothetical,
 * worth documenting so nobody re-introduces any of them:
 *
 * 1. Each letter's `PanResponder` must be created exactly once, via
 *    `useRef` in a stable sub-component (`DraggableLetter`) - never
 *    recreated by calling a plain function straight from render.
 *    `PanResponder.create()` allocates a fresh internal `gestureState`
 *    every time it's called; recreating it mid-gesture (which is exactly
 *    what happens if dragging's own state updates - moving the live drop
 *    indicator - trigger a re-render that recreates it) throws away the
 *    gesture's tracking state while the OS is still sending events for
 *    the same physical touch, silently corrupting it on every frame.
 *
 * 2. The drop-target math must stay entirely in one coordinate space.
 *    `DraggableLetter` reports `gestureState.dx`/`dy` (relative to the
 *    gesture's own start point) rather than absolute `pageX`/`pageY`
 *    screen coordinates - comparing an absolute screen coordinate
 *    against a `measureInWindow`-converted local layout position is a
 *    real, subtle source of drift (that conversion can be stale relative
 *    to the live touch position), and TROUBLESHOOTING IT the first time
 *    around didn't actually fix the underlying problem (see #3) - it's
 *    kept this way regardless because avoiding an unnecessary coordinate
 *    conversion is simply more robust on its own merits.
 *
 * 3. **The actual bug behind "only ever lands at the very first or last
 *    position, never in between"**: `letterLayoutsRef` must be populated
 *    from a layout measurement taken relative to *this component's own
 *    row container*, not relative to whatever the letter's immediate
 *    parent happens to be. `DraggableLetter` wraps each letter in its own
 *    `Animated.View` (needed to carry the drag transform) - if `onLayout`
 *    is attached to the letter's own inner content instead of to
 *    `DraggableLetter`'s outer wrapper, it reports position relative to
 *    that wrapper (its immediate parent), which - since the wrapper has
 *    no siblings and sizes to fit its single child exactly - is always
 *    ~0, regardless of where in the row the letter actually sits. Every
 *    letter ends up with a near-identical recorded x/center, so the
 *    "find the first sibling center greater than the dragged letter's
 *    live center" comparison degenerates to essentially just "did it
 *    move left or right at all", which only ever resolves to the very
 *    front or very end - exactly the reported symptom, and exactly why
 *    the coordinate-space fix in #2 alone didn't fix it. `onLayout` is
 *    attached to `DraggableLetter`'s own root `Animated.View` instead
 *    (which *is* a direct flex child of the row, so its layout actually
 *    is relative to the row) via an `onLayout` prop it's given.
 *
 * The indicator/gap-opening are absolutely-positioned overlays computed
 * from each letter's stable, drag-independent layout (not elements
 * inserted into the row) - inserting/removing the indicator inline would
 * shift every later letter's actual layout box, re-firing their
 * `onLayout` and feeding back into the very hit-testing math that
 * decides where the indicator goes.
 *
 * Also serves as the drop zone for letters dragged from the alphabet
 * grid: exposes `measureInWindow` via a ref so the screen can check a
 * grid drag's release point against this component's on-screen bounds
 * and append the letter itself (this component doesn't know about the
 * grid at all, keeping the coupling one-directional).
 *
 * Vanity filter integration (censoring profane words) is deferred along
 * with the rest of that system for this slice - always displays the raw
 * word.
 */
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, PanResponder, Text, View, StyleSheet } from 'react-native';
import { LockIcon } from './LockIcon';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { triggerHapticFeedback } from '../utils/haptics';

export interface LetterHighlight {
  index: number;
  type: 'key' | 'locked' | 'lockedKey';
}

export interface CurrentWordProps {
  word: string;
  highlights?: LetterHighlight[];
  /** If provided, tapping a letter calls this with its index (to remove it). */
  onLetterPress?: (index: number) => void;
  /** If provided (together with onLetterPress), dragging a letter to a
   * new position calls this with the reordered word. */
  onWordChange?: (newWord: string) => void;
}

export interface CurrentWordHandle {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

const DRAG_THRESHOLD = 6;
/** How far (px) a sibling letter shifts aside to open a gap for the
 * letter being dragged over/past it - matches web's WordBuilder.tsx
 * translateX(16px). */
const SIBLING_SHIFT = 16;
/** How far a letter lifts off the row while being dragged, and how much
 * it tilts - 80% of the letter's own font size (per user direction) and
 * a fixed counter-clockwise tilt, matching (and extending) web's
 * WordBuilder.css `--dragging` lift/rotate feedback. Negative Y moves it
 * up (RN's Y axis increases downward); negative rotation is counter-
 * clockwise. */
const DRAG_LIFT = -(36 * 0.8);
const DRAG_ROTATION = '-15deg';

interface LetterLayout {
  x: number;
  width: number;
}

/**
 * Compares the *dragged letter's own live center* (its original layout
 * position plus however far the finger has moved it) against every
 * other letter's original, static center - not the raw finger position
 * against absolute on-screen coordinates. This is both more robust (no
 * coordinate-space conversion between `pageX` and a separately-
 * `measureInWindow`'d container offset - a real bug in an earlier
 * version of this file: mixing absolute screen coordinates with local
 * layout coordinates through an offset that could be stale or measured
 * before the final layout pass settled, which systematically only
 * worked out correctly for far-left/far-right drags, never anything in
 * between) and closer to how drag-reorder libraries typically decide
 * "has this card been dragged far enough over its neighbor to swap".
 *
 * A standalone, exported pure function (rather than inlined in the
 * component) specifically so it's unit-testable without needing to
 * simulate a real native touch-drag sequence through PanResponder, which
 * isn't practical in this project's test environment.
 */
export function computeDropIndex(letterLayouts: Array<LetterLayout | null>, draggedIdx: number, dx: number): number {
  const draggedLayout = letterLayouts[draggedIdx];
  if (!draggedLayout) return draggedIdx;
  const draggedCenterX = draggedLayout.x + draggedLayout.width / 2 + dx;

  for (let i = 0; i < letterLayouts.length; i++) {
    if (i === draggedIdx) continue;
    const layout = letterLayouts[i];
    if (!layout) continue;
    const center = layout.x + layout.width / 2;
    if (draggedCenterX < center) return i;
  }
  return letterLayouts.length;
}

interface DraggableLetterProps {
  index: number;
  disabled: boolean;
  accessibilityLabel: string;
  /** Reports this letter's layout (x/width) *relative to the row
   * container*, not to this component's own wrapper - see this file's
   * doc comment for why that distinction is the whole point. */
  onLayout: (index: number, x: number, width: number) => void;
  onDragStart: (index: number) => void;
  /** `dx`/`dy` are relative to the gesture's *start* point (PanResponder's
   * own gestureState), not absolute screen coordinates - see this file's
   * doc comment for why the drop-target math is built entirely on this
   * plus each letter's local layout, and deliberately never touches
   * `pageX`/`measureInWindow`. */
  onDragMove: (index: number, dx: number, dy: number) => void;
  onDragRelease: (index: number, dx: number, dy: number) => void;
  /** The gesture was cancelled by the OS mid-drag (e.g. an interrupting
   * system alert) - reset visual state without attempting a reorder. */
  onDragCancel: (index: number) => void;
  onTap: (index: number) => void;
  children: React.ReactNode;
  // Deliberately loose (internal implementation detail component, not a
  // public API) - Animated.View's style prop type is awkward to spell
  // out exactly for a value that's sometimes a plain object, sometimes
  // an array mixing plain and Animated-interpolated values.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

/**
 * Owns one letter's PanResponder, created exactly once (see this file's
 * doc comment for why that's essential). All the values its callbacks
 * need are routed through a ref updated every render, so the responder
 * itself never has to be (and never is) recreated - same pattern as
 * GridCell.tsx's `latestRef`.
 */
const DraggableLetter: React.FC<DraggableLetterProps> = ({ index, disabled, accessibilityLabel, onLayout, onDragStart, onDragMove, onDragRelease, onDragCancel, onTap, children, style }) => {
  const latestRef = useRef({ disabled, onDragStart, onDragMove, onDragRelease, onDragCancel, onTap });
  useEffect(() => {
    latestRef.current = { disabled, onDragStart, onDragMove, onDragRelease, onDragCancel, onTap };
  }, [disabled, onDragStart, onDragMove, onDragRelease, onDragCancel, onTap]);

  const hasStartedDragRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latestRef.current.disabled,
      onMoveShouldSetPanResponder: () => !latestRef.current.disabled,
      onPanResponderGrant: () => {
        hasStartedDragRef.current = false;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (!hasStartedDragRef.current) {
          if (distance < DRAG_THRESHOLD) return;
          hasStartedDragRef.current = true;
          latestRef.current.onDragStart(index);
        }
        latestRef.current.onDragMove(index, gestureState.dx, gestureState.dy);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (hasStartedDragRef.current) {
          hasStartedDragRef.current = false;
          latestRef.current.onDragRelease(index, gestureState.dx, gestureState.dy);
          return;
        }
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (distance < DRAG_THRESHOLD && !latestRef.current.disabled) {
          latestRef.current.onTap(index);
        }
      },
      onPanResponderTerminate: () => {
        if (hasStartedDragRef.current) {
          hasStartedDragRef.current = false;
          latestRef.current.onDragCancel(index);
        }
      }
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      // See GridCell.tsx's identical comment: real taps are detected via
      // the PanResponder release handler above; this test-only escape
      // hatch is only so `fireEvent.press` in tests can still exercise a
      // plain tap without simulating a full touch sequence.
      {...({ onPress: () => !disabled && onTap(index) } as object)}
      // Measured here (this component's own root), not on `children`
      // (the actual letter content) - see this file's doc comment: this
      // Animated.View is a *direct* flex child of the row container, so
      // its `onLayout` reports x/width relative to that row exactly like
      // every other direct child does. `children`'s own onLayout would
      // instead report position relative to *this* wrapper, which - since
      // this wrapper has no siblings and sizes to fit its single child
      // exactly - is always ~0, regardless of where in the row this
      // letter actually sits.
      onLayout={e => onLayout(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      {children}
    </Animated.View>
  );
};

export const CurrentWord = React.forwardRef<CurrentWordHandle, CurrentWordProps>(
  ({ word, highlights = [], onLetterPress, onWordChange }, ref) => {
    const { currentTheme, isInverted } = useTheme();
    const colors = getEffectiveColors(currentTheme, isInverted);
    const letters = word.toUpperCase().split('');

    const containerRef = useRef<View>(null);
    // Keyed by letter index - stable for the duration of a drag, since
    // nothing about how the letters themselves are laid out changes
    // while dragging (see this file's doc comment). Coordinates are
    // local to this container (straight from `onLayout`), matching the
    // coordinate space `gestureState.dx` is measured in too - the drop-
    // target math below never has to convert between coordinate spaces.
    const letterLayoutsRef = useRef<Array<LetterLayout | null>>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const pulse = useRef(new Animated.Value(0.5)).current;
    // The word/highlights this render's callbacks should act on - a ref
    // so DraggableLetter's own stable callback props (onDragMove etc.,
    // freshly created every render but that's fine, see this file's doc
    // comment) always see the current word even though they're captured
    // once inside DraggableLetter's own frozen PanResponder.
    const lettersRef = useRef(letters);
    lettersRef.current = letters;

    useImperativeHandle(ref, () => ({
      measureInWindow: callback => containerRef.current?.measureInWindow(callback)
    }));

    // Pulsing drop indicator, matching web's WordBuilder.css @keyframes
    // pulse (opacity 0.5 <-> 1, 1s loop) - runs continuously; only ever
    // visible while a drop indicator is actually rendered.
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.5, duration: 500, useNativeDriver: true })
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [pulse]);

    const highlightMap = highlights.reduce((acc, { index, type }) => {
      acc[index] = type;
      return acc;
    }, {} as Record<number, 'key' | 'locked' | 'lockedKey'>);

    const handleDragStart = (index: number) => {
      // "Picking up" the letter - a distinct, immediate confirmation
      // that the drag has actually started (as opposed to a plain tap),
      // separate from the per-target-change feedback in handleDragMove
      // below and the on-drop feedback in handleDragRelease.
      triggerHapticFeedback('move');
      setDraggedIndex(index);
      setDropTargetIndex(index);
    };

    const handleDragMove = (index: number, dx: number, dy: number) => {
      pan.setValue({ x: dx, y: dy });
      const newDropTarget = computeDropIndex(letterLayoutsRef.current, index, dx);
      // Only on an actual change of target (matches web's WordBuilder.tsx
      // behavior exactly) - firing on every touch-move event, rather than
      // only when the drop position actually changes, would buzz
      // continuously instead of reading as discrete "clicks" into place.
      if (newDropTarget !== dropTargetIndex) {
        triggerHapticFeedback('move');
      }
      setDropTargetIndex(newDropTarget);
    };

    const handleDragRelease = (index: number, dx: number, dy: number) => {
      const dropIndex = computeDropIndex(letterLayoutsRef.current, index, dx);
      triggerHapticFeedback('move');
      pan.setValue({ x: 0, y: 0 });
      setDraggedIndex(null);
      setDropTargetIndex(null);

      if (!onWordChange) return;
      if (dropIndex === index || dropIndex === index + 1) return;

      const currentLetters = lettersRef.current;
      const letterArray = [...currentLetters];
      const [movedLetter] = letterArray.splice(index, 1);
      const insertIndex = dropIndex > index ? dropIndex - 1 : dropIndex;
      letterArray.splice(insertIndex, 0, movedLetter);
      onWordChange(letterArray.join(''));
    };

    const handleDragCancel = (_index: number) => {
      pan.setValue({ x: 0, y: 0 });
      setDraggedIndex(null);
      setDropTargetIndex(null);
    };

    const handleTap = (index: number) => {
      onLetterPress?.(index);
    };

    const isDragging = draggedIndex !== null;

    // Where to paint the drop indicator overlay - just before the
    // target letter, or just after the last letter's right edge when
    // the target is past the end of the word. Computed from the same
    // stable per-letter layouts the hit-testing itself uses, so it's
    // always exactly where a drop would actually land.
    let indicatorLeft: number | null = null;
    if (isDragging && dropTargetIndex !== null) {
      if (dropTargetIndex < letters.length) {
        indicatorLeft = letterLayoutsRef.current[dropTargetIndex]?.x ?? null;
      } else {
        const lastLayout = letterLayoutsRef.current[letters.length - 1];
        indicatorLeft = lastLayout ? lastLayout.x + lastLayout.width : null;
      }
    }

    return (
      <View
        ref={containerRef}
        style={styles.container}
        accessibilityRole="text"
        accessibilityLabel={`Current word: ${word}`}
      >
        {letters.map((letter, index) => {
          const highlightType = highlightMap[index];
          const isLocked = highlightType === 'locked' || highlightType === 'lockedKey';
          const color = highlightType === 'key' || highlightType === 'lockedKey' ? colors.accent : colors.text;
          const isBeingDragged = draggedIndex === index;

          // Shifts this letter aside to open a gap for the dragged
          // letter, mirroring web's WordBuilder.tsx translateX(16px)
          // logic exactly (ported, not reinvented).
          let siblingShiftX = 0;
          if (isDragging && !isBeingDragged && dropTargetIndex !== null && draggedIndex !== null) {
            if (index > dropTargetIndex && index > draggedIndex) {
              siblingShiftX = SIBLING_SHIFT;
            } else if (index >= dropTargetIndex && index < draggedIndex) {
              siblingShiftX = SIBLING_SHIFT;
            }
          }

          const letterContent = (
            <>
              <Text style={[styles.letter, { color }]}>{letter}</Text>
              {isLocked && (
                <View style={styles.lock} pointerEvents="none">
                  <LockIcon size={10} color={colors.accent} />
                </View>
              )}
            </>
          );

          const recordLayout = (x: number, width: number) => {
            letterLayoutsRef.current[index] = { x, width };
          };

          // Locked letters can't be removed or dragged (mirrors the
          // engine rule that rejects removing/moving a locked/lockedKey
          // letter), so they're not wrapped in a gesture handler even
          // when onLetterPress/onWordChange are provided. This View is a
          // *direct* flex child of the row container (no extra wrapper
          // like DraggableLetter adds below), so its own onLayout
          // already reports position relative to that row correctly.
          if ((!onLetterPress && !onWordChange) || isLocked) {
            return (
              <View
                key={index}
                onLayout={e => recordLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
                style={styles.letterWrap}
              >
                {letterContent}
              </View>
            );
          }

          return (
            <DraggableLetter
              key={index}
              index={index}
              disabled={false}
              accessibilityLabel={`Remove letter ${letter}`}
              onLayout={(_i, x, width) => recordLayout(x, width)}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragRelease={handleDragRelease}
              onDragCancel={handleDragCancel}
              onTap={handleTap}
              style={
                isBeingDragged
                  ? [
                      styles.removeLabel,
                      {
                        // Horizontal position tracks the finger (pan.x);
                        // vertical is a fixed lift rather than tracking
                        // the finger's real vertical position, matching
                        // web's WordBuilder.css lifted/tilted "picked up"
                        // look (which also uses a fixed lift, not the
                        // real drag offset, for the vertical axis).
                        transform: [{ translateX: pan.x }, { translateY: DRAG_LIFT }, { rotate: DRAG_ROTATION }],
                        zIndex: 10,
                        elevation: 10,
                        opacity: 0.85
                      }
                    ]
                  : [styles.removeLabel, { transform: [{ translateX: siblingShiftX }] }]
              }
            >
              <View style={styles.letterWrap}>{letterContent}</View>
            </DraggableLetter>
          );
        })}

        {indicatorLeft !== null && (
          <Animated.Text
            style={[styles.dropIndicator, { color: colors.accent, opacity: pulse, left: indicatorLeft }]}
            pointerEvents="none"
          >
            |
          </Animated.Text>
        )}
      </View>
    );
  }
);

CurrentWord.displayName = 'CurrentWord';

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
  // Purely a hook for the accessibilityLabel test infra expects on the
  // remove-letter gesture target; DraggableLetter doesn't otherwise
  // style itself, its child (letterEl) carries all the visuals.
  removeLabel: {},
  letter: {
    // Matches web's CurrentWord.css mobile breakpoint (48px * 0.75).
    fontSize: 36,
    fontWeight: '900'
  },
  dropIndicator: {
    position: 'absolute',
    top: 0,
    fontSize: 36,
    fontWeight: '900'
  },
  lock: {
    position: 'absolute',
    top: 2,
    right: -4
  }
});
