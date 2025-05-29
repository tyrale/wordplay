import React, { useState, useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LetterCell } from './LetterCell';

// Types for letter cell state
export type LetterCellState = 'normal' | 'selected' | 'key' | 'locked';

/**
 * AlphabetGrid displays a 5x6 grid of letter cells with interactive behaviors.
 * Supports tap, long-press, and drag gestures for word game mechanics.
 *
 * Props:
 * - letters: string[] - 26 letters, A-Z
 * - selectedIndices: number[] - indices of letters currently in the word
 * - keyIndex?: number - index of the key letter
 * - lockedIndex?: number - index of the locked letter
 * - onLetterTap?: (index: number) => void - called when a letter is tapped
 * - onLetterDrag?: (fromIndex: number, toIndex: number) => void - called when a letter is dragged within the grid
 * - onLetterDragToWord?: (index: number) => void - called when a letter is dragged to the word area
 * - onLetterDragFromWordToGrid?: (index: number) => void - called when a letter is dragged from the word area back to the grid
 * - wordAreaLayout?: { x, y, width, height } - layout of the word area for drag detection
 */
export interface AlphabetGridProps {
  letters: string[]; // 26 letters, A-Z
  selectedIndices: number[]; // indices of letters currently in the word
  keyIndex?: number; // index of the key letter
  lockedIndex?: number; // index of the locked letter
  onLetterTap?: (index: number) => void;
  onLetterDrag?: (fromIndex: number, toIndex: number) => void;
  onLetterDragToWord?: (index: number) => void;
  onLetterDragFromWordToGrid?: (index: number) => void;
  wordAreaLayout?: { x: number; y: number; width: number; height: number };
}

export const AlphabetGrid: React.FC<AlphabetGridProps> = ({
  letters,
  selectedIndices,
  keyIndex,
  lockedIndex,
  onLetterTap,
  onLetterDrag,
  onLetterDragToWord,
  onLetterDragFromWordToGrid,
  wordAreaLayout,
}) => {
  const [gridLayout, setGridLayout] = useState<{ x: number; y: number; width: number; height: number }>();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragProgress, setDragProgress] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setGridLayout({ x, y, width, height });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
  }, []);

  const handleDragEnd = useCallback((index: number) => {
    if (draggingIndex === null) return;

    // Check if drag ended over word area
    if (wordAreaLayout) {
      const { x: wordX, y: wordY, width: wordWidth, height: wordHeight } = wordAreaLayout;
      const { x: gridX, y: gridY } = gridLayout || { x: 0, y: 0 };

      // If dragging from grid to word
      if (!selectedIndices.includes(draggingIndex)) {
        if (wordY < gridY) {
          onLetterDragToWord?.(draggingIndex);
        }
      }
      // If dragging from word to grid
      else {
        if (wordY > gridY) {
          onLetterDragFromWordToGrid?.(draggingIndex);
        }
      }
    }

    setDraggingIndex(null);
    setDragProgress(0);
  }, [draggingIndex, gridLayout, wordAreaLayout, selectedIndices, onLetterDragToWord, onLetterDragFromWordToGrid]);

  const handleDragUpdate = useCallback((index: number, translationY: number) => {
    if (draggingIndex === null || !gridLayout || !wordAreaLayout) return;

    const { y: gridY } = gridLayout;
    const { y: wordY } = wordAreaLayout;
    const distance = Math.abs(wordY - gridY);
    const progress = Math.min(Math.abs(translationY) / distance, 1);
    setDragProgress(progress);
  }, [draggingIndex, gridLayout, wordAreaLayout]);

  return (
    <View style={styles.grid} onLayout={handleLayout}>
      {letters.map((letter, i) => {
        // Determine cell state
        let state: LetterCellState = 'normal';
        if (selectedIndices.includes(i)) state = 'selected';
        if (keyIndex === i) state = 'key';
        if (lockedIndex === i) state = 'locked';

        return (
          <LetterCell
            key={letter}
            letter={letter}
            state={state}
            onTap={() => onLetterTap?.(i)}
            onLongPress={() => {
              if (selectedIndices.includes(i)) {
                onLetterDragFromWordToGrid?.(i);
              }
            }}
            onDragStart={() => handleDragStart(i)}
            onDragEnd={() => handleDragEnd(i)}
            isDragging={draggingIndex === i}
            dragProgress={dragProgress}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 5 * 48 + 4 * 4, // 5 columns, 4 gaps
    height: 6 * 48 + 5 * 4, // 6 rows, 5 gaps
    gap: 4,
    alignSelf: 'center',
  },
  cell: {
    width: 48,
    height: 48,
    margin: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    // TODO: Add border, color, and state styles
  },
}); 