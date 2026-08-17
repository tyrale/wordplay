/**
 * Ports apps/web's `components/game/CurrentWord.tsx` + the reordering
 * half of `components/game/WordBuilder.tsx` (the append-a-new-letter
 * half lives in the screen that owns both this component and
 * AlphabetGrid - see AlphabetGrid.tsx's/GridCell.tsx's doc comments).
 *
 * Tapping a letter still removes it (paired with tapping a grid letter
 * to append it), but each letter can now also be dragged to a new
 * position within the word - mirroring web's drag-to-reorder gesture,
 * using core `Animated`/`PanResponder` (no extra native dependency).
 * Unlike web's continuous sibling-shift animation (which measures every
 * other letter's live position every frame to slide them out of the way
 * mid-drag), this only computes the final drop index on release - a
 * deliberately simpler approximation that still reorders correctly, just
 * without the same in-flight "letters part to make room" visual.
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
import React, { useImperativeHandle, useRef, useState } from 'react';
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

export const CurrentWord = React.forwardRef<CurrentWordHandle, CurrentWordProps>(
  ({ word, highlights = [], onLetterPress, onWordChange }, ref) => {
    const { currentTheme, isInverted } = useTheme();
    const colors = getEffectiveColors(currentTheme, isInverted);
    const letters = word.toUpperCase().split('');

    const containerRef = useRef<View>(null);
    const containerXRef = useRef(0);
    const letterLayoutsRef = useRef<Array<{ x: number; width: number } | null>>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const draggedIndexRef = useRef<number | null>(null);
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    useImperativeHandle(ref, () => ({
      measureInWindow: callback => containerRef.current?.measureInWindow(callback)
    }));

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
      for (let i = 0; i < letters.length; i++) {
        const layout = letterLayoutsRef.current[i];
        if (!layout) continue;
        const absoluteCenter = containerXRef.current + layout.x + layout.width / 2;
        if (pointerX < absoluteCenter) return i;
      }
      return letters.length;
    };

    const startPanResponderFor = (index: number) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (evt, gestureState) => {
          const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
          if (draggedIndexRef.current === null && distance >= DRAG_THRESHOLD) {
            draggedIndexRef.current = index;
            setDraggedIndex(index);
          }
          if (draggedIndexRef.current === index) {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          const wasDragging = draggedIndexRef.current === index;
          draggedIndexRef.current = null;
          setDraggedIndex(null);
          pan.setValue({ x: 0, y: 0 });

          if (wasDragging && onWordChange) {
            const dropIndex = computeDropIndex(evt.nativeEvent.pageX);
            if (dropIndex !== index && dropIndex !== index + 1) {
              const letterArray = [...letters];
              const [movedLetter] = letterArray.splice(index, 1);
              const insertIndex = dropIndex > index ? dropIndex - 1 : dropIndex;
              letterArray.splice(insertIndex, 0, movedLetter);
              onWordChange(letterArray.join(''));
            }
            return;
          }

          const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
          if (distance < DRAG_THRESHOLD) {
            onLetterPress?.(index);
          }
        },
        onPanResponderTerminate: () => {
          draggedIndexRef.current = null;
          setDraggedIndex(null);
          pan.setValue({ x: 0, y: 0 });
        }
      });

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

          const panResponder = startPanResponderFor(index);

          return (
            <Animated.View
              key={index}
              {...panResponder.panHandlers}
              // See GridCell.tsx's identical comment: real taps are
              // detected via the PanResponder release handler above;
              // this test-only escape hatch is only so `fireEvent.press`
              // can still exercise a plain tap-to-remove without a full
              // touch sequence.
              {...({ onPress: () => onLetterPress?.(index) } as object)}
              accessibilityRole="button"
              accessibilityLabel={`Remove letter ${letter}`}
              style={[
                isBeingDragged && {
                  transform: pan.getTranslateTransform(),
                  zIndex: 10,
                  elevation: 10,
                  opacity: 0.85
                }
              ]}
            >
              {letterEl}
            </Animated.View>
          );
        })}
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
  letter: {
    // Matches web's CurrentWord.css mobile breakpoint (48px * 0.75).
    fontSize: 36,
    fontWeight: '900'
  },
  lock: {
    position: 'absolute',
    top: 2,
    right: -4
  }
});
