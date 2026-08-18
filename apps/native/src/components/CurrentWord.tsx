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
 * Architecture note (this went through two broken versions before this
 * one - worth documenting why): each letter's `PanResponder` is owned by
 * its own stable sub-component (`DraggableLetter`), created exactly once
 * via `useRef` and never recreated. `PanResponder.create()` allocates a
 * fresh internal `gestureState` object (tracking the gesture's starting
 * point, accumulated dx/dy, etc.) every time it's called - calling it
 * again mid-gesture (e.g. from a plain function invoked straight from
 * render, re-run on every re-render) throws that tracking state away and
 * starts over, even though the OS is still sending touch-move events for
 * the *same* physical gesture. Since dragging inherently changes this
 * component's own state every frame (to move the drop indicator/open a
 * gap), re-rendering happens constantly *during* a drag - which was
 * silently corrupting the gesture on every single frame, making dragging
 * within the word not really work at all despite the drop-indicator/
 * gap-opening logic itself being correct in isolation. `DraggableLetter`
 * reports raw gesture data (page coordinates) up to this parent via
 * stable callback props (routed through a ref, same pattern GridCell.tsx
 * uses, so the callbacks *themselves* being recreated each render is
 * fine); the parent owns all the shared coordination state (which letter
 * is dragging, the live drop target, the shared Animated.ValueXY used to
 * paint the dragged letter's live offset).
 *
 * The indicator/gap-opening are still absolutely-positioned overlays
 * computed from each letter's stable, drag-independent layout (not
 * elements inserted into the row) - inserting/removing the indicator
 * inline would shift every later letter's actual layout box, re-firing
 * their `onLayout` and feeding back into the very hit-testing math that
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

interface LetterLayout {
  x: number;
  width: number;
}

interface DraggableLetterProps {
  index: number;
  disabled: boolean;
  accessibilityLabel: string;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, pageX: number, dx: number, dy: number) => void;
  onDragRelease: (index: number, pageX: number, dx: number, dy: number) => void;
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
const DraggableLetter: React.FC<DraggableLetterProps> = ({ index, disabled, accessibilityLabel, onDragStart, onDragMove, onDragRelease, onDragCancel, onTap, children, style }) => {
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
      onPanResponderMove: (evt, gestureState) => {
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (!hasStartedDragRef.current) {
          if (distance < DRAG_THRESHOLD) return;
          hasStartedDragRef.current = true;
          latestRef.current.onDragStart(index);
        }
        latestRef.current.onDragMove(index, evt.nativeEvent.pageX, gestureState.dx, gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (hasStartedDragRef.current) {
          hasStartedDragRef.current = false;
          latestRef.current.onDragRelease(index, evt.nativeEvent.pageX, gestureState.dx, gestureState.dy);
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
    const containerXRef = useRef(0);
    // Keyed by letter index - stable for the duration of a drag, since
    // nothing about how the letters themselves are laid out changes
    // while dragging (see this file's doc comment).
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

    const handleContainerLayout = () => {
      containerRef.current?.measureInWindow(x => {
        containerXRef.current = x;
      });
    };

    const highlightMap = highlights.reduce((acc, { index, type }) => {
      acc[index] = type;
      return acc;
    }, {} as Record<number, 'key' | 'locked' | 'lockedKey'>);

    const computeDropIndex = (pointerX: number): number => {
      const currentLetters = lettersRef.current;
      for (let i = 0; i < currentLetters.length; i++) {
        const layout = letterLayoutsRef.current[i];
        if (!layout) continue;
        const absoluteCenter = containerXRef.current + layout.x + layout.width / 2;
        if (pointerX < absoluteCenter) return i;
      }
      return currentLetters.length;
    };

    const handleDragStart = (index: number) => {
      setDraggedIndex(index);
      setDropTargetIndex(index);
    };

    const handleDragMove = (index: number, pageX: number, dx: number, dy: number) => {
      pan.setValue({ x: dx, y: dy });
      setDropTargetIndex(computeDropIndex(pageX));
    };

    const handleDragRelease = (index: number, pageX: number, dx: number, dy: number) => {
      const dropIndex = computeDropIndex(pageX);
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
        onLayout={handleContainerLayout}
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

          const letterEl = (
            <View
              onLayout={e => {
                letterLayoutsRef.current[index] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
              }}
              style={styles.letterWrap}
            >
              <Text style={[styles.letter, { color }]}>{letter}</Text>
              {isLocked && (
                <View style={styles.lock} pointerEvents="none">
                  <LockIcon size={10} color={colors.accent} />
                </View>
              )}
            </View>
          );

          // Locked letters can't be removed or dragged (mirrors the
          // engine rule that rejects removing/moving a locked/lockedKey
          // letter), so they're not wrapped in a gesture handler even
          // when onLetterPress/onWordChange are provided.
          if ((!onLetterPress && !onWordChange) || isLocked) {
            return <React.Fragment key={index}>{letterEl}</React.Fragment>;
          }

          return (
            <DraggableLetter
              key={index}
              index={index}
              disabled={false}
              accessibilityLabel={`Remove letter ${letter}`}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragRelease={handleDragRelease}
              onDragCancel={handleDragCancel}
              onTap={handleTap}
              style={
                isBeingDragged
                  ? [styles.removeLabel, { transform: pan.getTranslateTransform(), zIndex: 10, elevation: 10, opacity: 0.85 }]
                  : [styles.removeLabel, { transform: [{ translateX: siblingShiftX }] }]
              }
            >
              {letterEl}
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
