/**
 * Native Alert Overlay Component.
 *
 * Ports apps/web's `components/ui/AlertOverlay.tsx` - the universal
 * full-screen overlay used for every alert/notification pattern in the
 * app (win/lose/quit screens, unlocks, challenge outcomes, generic
 * alerts). Per the user's explicit direction, this is a real full-screen
 * overlay matching web's pattern - not a toast/snackbar.
 *
 * Headline sizing: web measures each line's rendered width via an
 * offscreen `<canvas>` (`ctx.measureText`) and scales its font-size so
 * the line fills ~105% of the frame width - independent per line, so a
 * 2-letter and 8-letter line both end up bleeding past the screen edges
 * by design. React Native has no canvas text-measurement API, so this
 * uses `onTextLayout` instead: render each line once at a reasonable
 * initial guess (the same character-count heuristic this used to rely
 * on *entirely* - now only a starting point), read back its *actual*
 * rendered width once RN has laid it out, and correct the font size by
 * the same proportional-scaling formula web's canvas measurement uses
 * (font metrics scale linearly with font size for a fixed string, so a
 * single correction pass converges very close to exact - this isn't an
 * estimate anymore, it's a real measurement, just arriving one render
 * later than web's synchronous canvas call can).
 */
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
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

/** Target line width as a fraction of the overlay's width - lines are
 * deliberately ~5% too wide so their outermost letter edges bleed past
 * the screen (matches web's `TARGET_WIDTH_VW` exactly). */
const TARGET_WIDTH_FRACTION = 1.05;
/** Each line's measurement/layout box is wider than TARGET_WIDTH_FRACTION
 * itself, purely so React Native's text layout has enough room to never
 * need to wrap the line (RN Text wraps by default whenever it doesn't
 * fit its available width - unlike the web version, which only needed
 * `white-space: nowrap` to prevent that). Centering this deliberately
 * oversized, unclipped box is what makes the line bleed symmetrically
 * past both screen edges. */
const LINE_BOX_WIDTH_FRACTION = 1.4;
/** Matches web's MIN_FONT_SIZE/MAX_FONT_SIZE_VH_FRACTION exactly - a flat
 * per-line cap, not divided across however many lines there are (web
 * doesn't do that either; headline phrases are assumed short). */
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE_VH_FRACTION = 0.3;
/** Tight leading so multiple stacked headline words sit close together -
 * matches web's AlertOverlay.css `line-height: 0.8` exactly (RN's
 * `lineHeight` is an absolute px value, not a unitless multiplier, so
 * this gets multiplied by the line's own fitted font size below). */
const LINE_HEIGHT_RATIO = 0.8;
/** Empirical average glyph-width-to-font-size ratio for the system's
 * default bold sans-serif - used only to pick a reasonable *starting*
 * font size before the real `onTextLayout` measurement corrects it (see
 * module doc comment), not as the final answer the way it used to be. */
const AVG_CHAR_WIDTH_RATIO = 0.62;

/** Pure, dependency-free so it's directly unit-testable without
 * rendering - the initial guess `FitLine` below measures and corrects. */
export function estimateFontSize(line: string, containerWidth: number, containerHeight: number): number {
  const length = Math.max(line.trim().length, 1);
  const targetWidth = containerWidth * TARGET_WIDTH_FRACTION;
  const estimated = targetWidth / (length * AVG_CHAR_WIDTH_RATIO);
  const maxSize = containerHeight * MAX_FONT_SIZE_VH_FRACTION;
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

interface FitLineProps {
  text: string;
  displayText: string;
  targetWidth: number;
  maxFontSize: number;
  color: string;
}

/** Renders one headline line, correcting its own font size once real
 * layout measurement is available - see this file's doc comment. */
const FitLine: React.FC<FitLineProps> = ({ text, displayText, targetWidth, maxFontSize, color }) => {
  const [fontSize, setFontSize] = useState(() => estimateFontSize(text, targetWidth / TARGET_WIDTH_FRACTION, maxFontSize / MAX_FONT_SIZE_VH_FRACTION));
  const correctedRef = useRef(false);

  const handleTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (correctedRef.current) return;
    correctedRef.current = true;

    const measuredWidth = e.nativeEvent.lines.reduce((sum, l) => sum + l.width, 0);
    if (measuredWidth <= 0) return;

    const fitSize = (targetWidth / measuredWidth) * fontSize;
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(fitSize, maxFontSize));
    if (Math.abs(clamped - fontSize) > 0.5) {
      setFontSize(clamped);
    }
  };

  return (
    <Text
      numberOfLines={1}
      onTextLayout={handleTextLayout}
      style={[styles.line, { fontSize, lineHeight: fontSize * LINE_HEIGHT_RATIO, color }]}
    >
      {displayText}
    </Text>
  );
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
  const targetWidth = width * TARGET_WIDTH_FRACTION;
  const maxFontSize = height * MAX_FONT_SIZE_VH_FRACTION;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} accessibilityRole="alert" accessibilityViewIsModal>
      <View style={styles.linesContainer}>
        {lines.map((line, index) => (
          <View key={`${index}-${line}`} style={{ width: width * LINE_BOX_WIDTH_FRACTION, alignItems: 'center' }}>
            <FitLine
              text={line}
              displayText={variant === 'start' ? line : line.toUpperCase()}
              targetWidth={targetWidth}
              maxFontSize={maxFontSize}
              color={lineColor}
            />
          </View>
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
    alignSelf: 'center',
    padding: 12
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 32
  }
});
