/**
 * Native Alert Overlay Component.
 *
 * Ports apps/web's `components/ui/AlertOverlay.tsx` - the universal
 * full-screen overlay used for every alert/notification pattern in the
 * app (win/lose/quit screens, unlocks, challenge outcomes, generic
 * alerts). Per the user's explicit direction, this is a real full-screen
 * overlay matching web's pattern - not a toast/snackbar.
 *
 * One deliberate implementation difference: the web version measures each
 * line's rendered width via an offscreen `<canvas>` and scales its
 * font-size so the line fills ~105% of the viewport width (independent
 * per line - a 2-letter and 8-letter line both end up filling the
 * screen). React Native has no canvas text-measurement API. Rather than
 * building a multi-pass `onTextLayout`-based measurement (real, but adds
 * meaningful complexity and needs on-device tuning to get pixel-perfect,
 * which isn't practical to verify in this environment without a
 * simulator), this uses a deterministic character-count heuristic
 * (`estimateFontSize`) that approximates the same "fill the width"
 * effect. The `AVG_CHAR_WIDTH_RATIO` constant is the one value worth
 * tuning against the real system font on a device - it's a pure,
 * dependency-free function, easy to unit test and adjust independently
 * of the rest of the component.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { triggerHapticFeedback } from '../utils/haptics';
import type { HapticPattern } from '../utils/haptics';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export interface AlertOverlayAction {
  label: string;
  onPress: () => void;
}

export type AlertOverlayVariant = 'default' | 'win' | 'lose' | 'unlock' | 'error' | 'start';

export interface AlertOverlayProps {
  isVisible: boolean;
  lines: string[];
  onClose: () => void;
  variant?: AlertOverlayVariant;
  meta?: React.ReactNode;
  actions?: AlertOverlayAction[];
}

/** Target line width as a fraction of the overlay's width. */
const TARGET_WIDTH_FRACTION = 1.05;
const MIN_FONT_SIZE = 24;
/** Cap line height as a fraction of overlay height, so a single very
 * short line (e.g. "BRUH") doesn't blow past a sensible max size. */
const MAX_FONT_SIZE_HEIGHT_FRACTION = 0.16;
/** Empirical average glyph-width-to-font-size ratio for the system's
 * default bold sans-serif - the one constant worth tuning on a real
 * device (see module doc comment). */
const AVG_CHAR_WIDTH_RATIO = 0.62;

/** Pure, dependency-free so it's directly unit-testable without rendering. */
export function estimateFontSize(line: string, containerWidth: number, containerHeight: number): number {
  const length = Math.max(line.trim().length, 1);
  const targetWidth = containerWidth * TARGET_WIDTH_FRACTION;
  const estimated = targetWidth / (length * AVG_CHAR_WIDTH_RATIO);
  const maxSize = containerHeight * MAX_FONT_SIZE_HEIGHT_FRACTION;
  return Math.max(MIN_FONT_SIZE, Math.min(estimated, maxSize));
}

const VARIANT_HAPTIC: Record<AlertOverlayVariant, HapticPattern> = {
  default: 'overlay',
  start: 'overlay',
  error: 'overlay',
  unlock: 'unlock',
  win: 'win',
  lose: 'lose'
};

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ isVisible, lines, onClose, variant = 'default', meta, actions }) => {
  const { width, height } = useWindowDimensions();
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  useEffect(() => {
    if (isVisible) {
      triggerHapticFeedback(VARIANT_HAPTIC[variant]);
    }
  }, [isVisible, variant]);

  if (!isVisible) return null;

  // Matches web: lose/error variants use the theme's text color; every
  // other variant (including the default) uses the accent color.
  const lineColor = variant === 'lose' || variant === 'error' ? colors.text : colors.accent;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} accessibilityRole="alert" accessibilityViewIsModal>
      <View style={styles.linesContainer}>
        {lines.map((line, index) => (
          <Text
            key={index}
            style={[styles.line, { fontSize: estimateFontSize(line, width, height), color: lineColor }]}
          >
            {variant === 'start' ? line : line.toUpperCase()}
          </Text>
        ))}
      </View>

      {meta && (
        <View style={styles.meta}>
          {typeof meta === 'string' ? <Text style={[styles.metaText, { color: colors.text }]}>{meta}</Text> : meta}
        </View>
      )}

      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map(action => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={[styles.actionButton, { borderColor: colors.text }]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  linesContainer: {
    alignItems: 'center'
  },
  line: {
    fontWeight: '900',
    textAlign: 'center'
  },
  meta: {
    marginTop: 16,
    paddingHorizontal: 32
  },
  metaText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2
  },
  actionButtonText: {
    fontWeight: '700'
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    padding: 16
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '300'
  }
});
