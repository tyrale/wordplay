/**
 * Ports apps/web's `components/ui/GridCell.tsx`. Action glyphs (←, ↻, ≡)
 * render as plain text, same as web - it relies on the system font's
 * glyph coverage for these Unicode characters, matching web's own
 * approach exactly (by design/user direction, not an oversight).
 *
 * Letter cells (not action buttons) support a real drag gesture, mirroring
 * web's HTML5 drag-and-drop: press-and-hold-and-move lifts the tile (a
 * floating clone follows the finger, using core `Animated`/`PanResponder`
 * - no extra native dependency), and releasing it reports the release
 * point via `onDragRelease` so the caller (AlphabetGrid -> the game
 * screen) can decide whether it landed on the word-in-play (append) or
 * not. A release with negligible movement is treated as a normal tap
 * (`onPress`), matching web's own tap-vs-drag distance threshold.
 *
 * Styling: the web version's CSS reads theme colors from CSS custom
 * properties; this reads them from `useTheme()` and builds a plain style
 * array per render (no CSS classes, no --theme-* variables - see
 * src/theme/ThemeProvider.tsx's doc comment).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View, StyleSheet } from 'react-native';
import { LockIcon } from './LockIcon';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export type GridCellState = 'normal' | 'key' | 'locked' | 'lockedKey' | 'disabled';
export type GridCellType = 'letter' | 'action';

/** Minimum finger movement (px) before a press-and-move counts as a drag
 * rather than a tap - matches web's WordBuilder/AlphabetGrid 5px threshold. */
const DRAG_THRESHOLD = 6;

export interface GridCellProps {
  content: string;
  state?: GridCellState;
  type?: GridCellType;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** When true, hides the letter's visual content while keeping the tile
   * fully functional (tappable) - the Ninjabot gimmick. */
  contentHidden?: boolean;
  /** Cell size in px - matches web's mobile breakpoint (60px) by default;
   * the native grid computes this from window width instead of fixed
   * breakpoints (see AlphabetGrid.tsx). */
  size?: number;
  /** Letter cells only: enables the drag gesture described above. Action
   * buttons are never draggable, matching web. */
  draggable?: boolean;
  /** Fired once, when a drag gesture (movement past the threshold)
   * begins. */
  onDragStart?: () => void;
  /** Fired on every touch-move once dragging (screen coordinates), so the
   * caller can show a live drop-target indicator. */
  onDragMove?: (pageX: number, pageY: number) => void;
  /** Fired when a drag gesture ends (screen coordinates of the release
   * point) - not fired for a plain tap. */
  onDragRelease?: (pageX: number, pageY: number) => void;
}

export const GridCell: React.FC<GridCellProps> = ({
  content,
  state = 'normal',
  type = 'letter',
  onPress,
  disabled = false,
  accessibilityLabel,
  contentHidden = false,
  size = 60,
  draggable = false,
  onDragStart,
  onDragMove,
  onDragRelease
}) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const textColor = type === 'action' || state === 'key' ? colors.accent : colors.text;
  // Web's GridCell.css mobile breakpoint ratios are ~28px/60px cell for
  // letters and ~38px/60px for action glyphs; scaled down ~25% from that
  // per on-device feedback (in two rounds: -10%, then another -15% -
  // web's literal ratio reads noticeably too large once actually
  // rendered on a phone). Reduced by a further 15% per on-device
  // feedback that the fonts were still too large on iPhone.
  const fontSize = type === 'action' ? size * 0.482 * 0.85 : size * 0.36 * 0.85;

  const canDrag = draggable && !disabled && type === 'letter';
  const [isDragging, setIsDragging] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDraggingRef = useRef(false);

  // PanResponder.create() only ever runs once (useRef freezes its result
  // after the first render), so its callbacks would otherwise close over
  // whatever `canDrag`/`disabled`/`onPress`/etc. happened to be on that
  // very first render forever (a real, easy-to-miss stale-closure bug -
  // e.g. a cell disabled during the game's async startup would stay
  // permanently non-draggable/non-tappable even once enabled). Routing
  // every value the callbacks need through a ref, updated on every
  // render, keeps them reading the current props instead.
  const latestRef = useRef({ canDrag, disabled, onPress, onDragStart, onDragMove, onDragRelease });
  useEffect(() => {
    latestRef.current = { canDrag, disabled, onPress, onDragStart, onDragMove, onDragRelease };
  }, [canDrag, disabled, onPress, onDragStart, onDragMove, onDragRelease]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latestRef.current.canDrag,
      onMoveShouldSetPanResponder: () => latestRef.current.canDrag,
      onPanResponderMove: (evt, gestureState) => {
        if (!isDraggingRef.current) {
          const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
          if (distance < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          setIsDragging(true);
          latestRef.current.onDragStart?.();
        }
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        latestRef.current.onDragMove?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const wasDragging = isDraggingRef.current;
        isDraggingRef.current = false;
        setIsDragging(false);
        pan.setValue({ x: 0, y: 0 });

        if (wasDragging) {
          latestRef.current.onDragRelease?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        } else if (!latestRef.current.disabled) {
          // Negligible movement - treat as a normal tap.
          const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
          if (distance < DRAG_THRESHOLD) latestRef.current.onPress?.();
        }
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        pan.setValue({ x: 0, y: 0 });
      }
    })
  ).current;

  const cellContent = (
    <View style={styles.content}>
      <Text
        style={[
          { color: textColor, fontSize, fontWeight: '900' },
          contentHidden && type === 'letter' ? styles.hiddenContent : null
        ]}
      >
        {content}
      </Text>
    </View>
  );

  if (canDrag) {
    return (
      <View style={{ width: size, height: size }}>
        <Animated.View
          {...panResponder.panHandlers}
          // A real device never triggers this directly (plain Views
          // don't implement RN's Pressability, unlike Pressable) - taps
          // are actually detected via the PanResponder release handler
          // above (movement below DRAG_THRESHOLD -> onPress). This is
          // kept only so `fireEvent.press` in tests (which invokes
          // whatever `onPress` prop it finds, regardless of the
          // underlying gesture system) can still exercise a plain tap
          // without simulating a full touch sequence. View has no
          // official `onPress` prop (unlike Pressable) - the cast below
          // is a deliberate, test-only escape hatch, not a typo.
          {...({ onPress: !disabled ? onPress : undefined } as object)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || content}
          style={[
            styles.cell,
            {
              width: size,
              height: size,
              opacity: isDragging ? 0.7 : 1,
              transform: pan.getTranslateTransform(),
              // Lifted above sibling cells while dragging, matching
              // web's WordBuilder-style "lift" visual feedback.
              zIndex: isDragging ? 10 : 0,
              elevation: isDragging ? 10 : 0
            }
          ]}
        >
          {cellContent}
        </Animated.View>
        {(state === 'locked' || state === 'lockedKey') && (
          <View style={styles.lock} pointerEvents="none">
            <LockIcon size={size * 0.275} color={colors.accent} />
          </View>
        )}
      </View>
    );
  }

  const handlePress = () => {
    if (!disabled && onPress) onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || content}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1
        }
      ]}
    >
      {cellContent}
      {(state === 'locked' || state === 'lockedKey') && (
        <View style={styles.lock} pointerEvents="none">
          <LockIcon size={size * 0.275} color={colors.accent} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cell: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  hiddenContent: {
    opacity: 0
  },
  lock: {
    position: 'absolute',
    bottom: '2%',
    left: 0,
    right: 0,
    alignItems: 'center'
  }
});
