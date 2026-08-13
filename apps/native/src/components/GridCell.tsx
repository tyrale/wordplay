/**
 * Ports apps/web's `components/ui/GridCell.tsx`. The web version supports
 * both click and native HTML5 drag-and-drop; this Phase 2 slice only
 * implements tap (see AlphabetGrid.tsx's doc comment for why drag is
 * deferred) - `draggable`/`onDragStart`/`onDragEnd` are intentionally not
 * ported yet.
 *
 * Styling: the web version's CSS reads theme colors from CSS custom
 * properties; this reads them from `useTheme()` and builds a plain style
 * array per render (no CSS classes, no --theme-* variables - see
 * src/theme/ThemeProvider.tsx's doc comment).
 */
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LockIcon } from './LockIcon';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export type GridCellState = 'normal' | 'key' | 'locked' | 'lockedKey' | 'disabled';
export type GridCellType = 'letter' | 'action';

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
  /** Cell size in px - the web version has fixed breakpoint sizes (112/96/60px);
   * the native grid computes this from window width instead (see AlphabetGrid.tsx). */
  size?: number;
}

export const GridCell: React.FC<GridCellProps> = ({
  content,
  state = 'normal',
  type = 'letter',
  onPress,
  disabled = false,
  accessibilityLabel,
  contentHidden = false,
  size = 60
}) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const textColor = type === 'action' || state === 'key' ? colors.accent : colors.text;
  const fontSize = type === 'action' ? size * 0.4 : size * 0.36;

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
      {(state === 'locked' || state === 'lockedKey') && (
        <View style={styles.lock} pointerEvents="none">
          <LockIcon size={size * 0.11} color={colors.accent} />
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
    top: '28%',
    right: '8%'
  }
});
