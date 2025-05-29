import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export type LetterCellState = 'normal' | 'selected' | 'key' | 'locked';

export interface LetterCellProps {
  letter: string;
  state: LetterCellState;
  onTap?: () => void;
  onLongPress?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  dragProgress?: number;
}

/**
 * LetterCell is a single letter tile with animated and interactive behaviors.
 * Supports tap, long-press, and drag gestures for word game mechanics.
 *
 * Props:
 * - letter: string - the letter to display
 * - state: 'normal' | 'selected' | 'key' | 'locked' - visual state
 * - onTap?: () => void - called when tapped
 * - onLongPress?: () => void - called on long press
 * - onDragStart?: () => void - called when drag starts
 * - onDragEnd?: () => void - called when drag ends
 * - isDragging?: boolean - whether the cell is being dragged
 * - dragProgress?: number - progress of drag animation
 */
export const LetterCell: React.FC<LetterCellProps> = ({
  letter,
  state,
  onTap,
  onLongPress,
  onDragStart,
  onDragEnd,
  isDragging,
  dragProgress = 0,
}) => {
  // Gesture handlers
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      onTap?.();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      onLongPress?.();
    });

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      onDragStart?.();
    })
    .onEnd(() => {
      onDragEnd?.();
    });

  // Compose gestures
  const composed = Gesture.Simultaneous(
    Gesture.Race(tapGesture, longPressGesture),
    dragGesture
  );

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isDragging ? 1.1 : 1, {
      damping: 15,
      stiffness: 150,
    });

    const opacity = interpolate(
      dragProgress,
      [0, 1],
      [1, 0.5],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      dragProgress,
      [0, 1],
      [0, -20],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { scale },
        { translateY },
      ],
      opacity,
    };
  });

  // Cell styles based on state
  const getCellStyle = () => {
    switch (state) {
      case 'selected':
        return styles.selectedCell;
      case 'key':
        return styles.keyCell;
      case 'locked':
        return styles.lockedCell;
      default:
        return styles.normalCell;
    }
  };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.cell, getCellStyle(), animatedStyle]}>
        <View style={styles.letterContainer}>
          <Animated.Text style={styles.letter}>{letter}</Animated.Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  normalCell: {
    backgroundColor: '#E0E0E0',
  },
  selectedCell: {
    backgroundColor: '#4CAF50',
  },
  keyCell: {
    backgroundColor: '#FFC107',
  },
  lockedCell: {
    backgroundColor: '#9E9E9E',
  },
  letterContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
}); 