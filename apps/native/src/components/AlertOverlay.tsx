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
 *
 * Unlike a DOM `<div>` (which hugs its own content width unless told
 * otherwise), an RN `<Text>` always wraps to whatever layout width Yoga
 * hands it - there's no "intrinsic content width" fallback. So each
 * line still sits in a `width`-constrained box (`LINE_BOX_WIDTH_FRACTION`
 * below), but that box now has to be wide enough to comfortably fit the
 * *initial, uncorrected* guess too, not just the final fitted size - a
 * too-narrow box previously forced a wrap/truncate on that first render
 * (before the real measurement/correction ever got a chance to run),
 * which fed the correction formula a bogus, way-too-small "real width"
 * and made short/wide words like "THE" balloon to a broken size.
 */
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { TextLayoutEvent } from 'react-native';
import { triggerHapticFeedback } from '../utils/haptics';
import type { HapticPattern } from '../utils/haptics';
import { triggerSoundFeedback } from '../utils/sound';
import type { SoundPattern } from '../utils/sound';
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
/** Matches web's MIN_FONT_SIZE/MAX_FONT_SIZE_VH_FRACTION exactly - a flat
 * per-line cap, not divided across however many lines there are (web
 * doesn't do that either; headline phrases are assumed short). */
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE_VH_FRACTION = 0.3;
/** Each line's layout box, as a multiple of screen width - deliberately
 * huge (not just "a bit more than" TARGET_WIDTH_FRACTION) so that even
 * the worst case - a very short line whose *initial, uncorrected* guess
 * hits the MAX_FONT_SIZE_VH_FRACTION cap - never wraps or truncates
 * before `onTextLayout`'s real measurement/correction can run (see this
 * file's doc comment). A short line hitting that cap can plausibly need
 * up to roughly `(chars) * maxFontSize` of width at very wide glyph
 * proportions; this multiplier comfortably covers that for any headline
 * short enough to realistically hit the cap in the first place (longer
 * lines settle for a much smaller initial guess and need nowhere near
 * this much room) - and an oversized box has no visual cost since only
 * the actually-fitted text (bounded by TARGET_WIDTH_FRACTION) is ever
 * visible on screen either way. */
const LINE_BOX_WIDTH_FRACTION = 8;
/** Tight leading so multiple stacked headline words sit almost touching -
 * aims to match web's AlertOverlay.css `line-height: 0.8`, but *not* via
 * RN's `lineHeight` style prop the way this used to: a browser happily
 * lets a glyph visually overflow a `line-height` box shorter than the
 * font needs (that's exactly how the tight-leading look works on web),
 * but RN's native text renderer treats `lineHeight` as a hard clip box -
 * setting it below the font's natural line height on-device clipped the
 * *top* off every glyph. Applying the equivalent reduction as a negative
 * `marginTop` instead (see FitLine below, and skipped on the first line)
 * achieves the same tight overlap by pulling each line's already-full-
 * height, unclipped text box closer to the one above it, rather than
 * shrinking the box text renders into. One-sided (not `marginVertical`)
 * so this maps directly to the actual gap between two lines, instead of
 * being doubled by both lines each contributing their own top+bottom
 * margin.
 *
 * Scaled proportionally to the *smaller of the two adjacent lines' own
 * fitted font sizes* (see `lineFontSizes` state below), not a flat pixel
 * value - web's `line-height: 0.8` is a ratio of each line's own
 * font-size, so the amount of overlap it produces between two lines is
 * inherently proportional to how big those two lines render. Headline
 * lines are fitted independently to the target width (a short word like
 * "NEW" renders far larger than a long phrase like "5 LETTER START"), so
 * a flat pixel margin previously pulled small-font lines up by way more
 * than their own line-height, overlapping them entirely into whatever
 * huge line sat above. Using the *smaller* of the pair (rather than,
 * say, an average) guarantees the pull-up never exceeds what the
 * smaller, more constrained line can visually absorb, regardless of how
 * large its neighbor happens to be. */
const LEADING_MARGIN_RATIO = 0.4;
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
  /** Negative top margin to apply, precomputed by the parent from this
   * line's and the previous line's fitted font sizes (see
   * `LEADING_MARGIN_RATIO`) - 0 for the first line, since there's no
   * previous line to pull this one closer to. */
  marginTop: number;
  /** Reports this line's fitted font size back up to the parent (both
   * the initial guess and any later `onTextLayout` correction) so it can
   * recompute neighboring lines' `marginTop` off the real values instead
   * of a flat pixel guess. */
  onFontSizeChange: (fontSize: number) => void;
}

/** Renders one headline line, correcting its own font size once real
 * layout measurement is available - see this file's doc comment.
 *
 * Deliberately has no `numberOfLines` - wrapping to a second line or
 * truncating with an ellipsis are both explicitly unwanted here (a
 * headline is always meant to render as one bled-past-the-edges line),
 * and either one would corrupt the `onTextLayout` measurement this
 * relies on to correct the font size (a wrapped/truncated line reports
 * a much narrower "real width" than the line actually needs, which
 * over-corrects the font size even larger in response). Sitting in the
 * generously wide `LINE_BOX_WIDTH_FRACTION` box (see above) is what
 * actually prevents the wrap/truncate from happening in the first
 * place - this component doesn't need to know about that, just that it
 * must never self-limit past whatever room its parent gives it. */
const FitLine: React.FC<FitLineProps> = ({ text, displayText, targetWidth, maxFontSize, color, marginTop, onFontSizeChange }) => {
  const [fontSize, setFontSize] = useState(() => estimateFontSize(text, targetWidth / TARGET_WIDTH_FRACTION, maxFontSize / MAX_FONT_SIZE_VH_FRACTION));
  const correctedRef = useRef(false);

  // Reports the initial guess up as soon as it's known, and again if
  // `handleTextLayout` below corrects it - `onFontSizeChange` is a
  // stable per-index setter (see AlertOverlay), so this only re-fires
  // when `fontSize` itself actually changes.
  useEffect(() => {
    onFontSizeChange(fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFontSizeChange is a stable per-index closure; re-running on it would be a no-op anyway
  }, [fontSize]);

  const handleTextLayout = (e: TextLayoutEvent) => {
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
      onTextLayout={handleTextLayout}
      style={[styles.line, { fontSize, marginTop, color }]}
    >
      {displayText}
    </Text>
  );
};

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ isVisible, lines, onClose, variant = 'default', meta, actions }) => {
  const { width, height } = useWindowDimensions();
  const lineBoxWidth = width * LINE_BOX_WIDTH_FRACTION;
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  // Each line's currently-fitted font size (initial guess, then corrected
  // in place once `FitLine`'s `onTextLayout` measurement comes in) - kept
  // here rather than local to each `FitLine` so `marginTop` below can be
  // computed off *both* of two adjacent lines' real sizes instead of a
  // flat pixel value (see `LEADING_MARGIN_RATIO`'s doc comment). Reset
  // whenever the copy itself changes so stale sizes from a previous
  // alert don't leak into a new one's initial margins.
  const [lineFontSizes, setLineFontSizes] = useState<number[]>(() => lines.map(line => estimateFontSize(line, width, height)));
  useEffect(() => {
    setLineFontSizes(lines.map(line => estimateFontSize(line, width, height)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lines.join` gives a stable key so this only resets when the actual copy changes, not on every parent re-render
  }, [lines.join('\u0000'), width, height]);

  useEffect(() => {
    if (isVisible) {
      triggerHapticFeedback(VARIANT_HAPTIC[variant]);
      // Every HapticPattern value used above is also a valid SoundPattern
      // (both unions share these literal names) - matches web's
      // AlertOverlay.tsx, which computes and calls both from the same
      // single pattern value.
      triggerSoundFeedback(VARIANT_HAPTIC[variant] as SoundPattern);
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
        {lines.map((line, index) => {
          // Uses the smaller of this line's and the previous line's
          // fitted font sizes - see `LEADING_MARGIN_RATIO`'s doc comment
          // for why the smaller (not larger, not average) of the pair.
          const marginTop = index === 0 ? 0 : -LEADING_MARGIN_RATIO * Math.min(lineFontSizes[index - 1] ?? 0, lineFontSizes[index] ?? 0);
          return (
            <View key={`${index}-${line}`} style={[styles.lineBox, { width: lineBoxWidth }]}>
              <FitLine
                text={line}
                displayText={variant === 'start' ? line : line.toUpperCase()}
                targetWidth={targetWidth}
                maxFontSize={maxFontSize}
                color={lineColor}
                marginTop={marginTop}
                onFontSizeChange={fontSize =>
                  setLineFontSizes(prev => {
                    if (prev[index] === fontSize) return prev;
                    const next = [...prev];
                    next[index] = fontSize;
                    return next;
                  })
                }
              />
            </View>
          );
        })}
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
              onPress={() => {
                triggerSoundFeedback('click');
                action.onPress();
              }}
              style={[styles.actionButton, { borderColor: colors.text }]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          triggerSoundFeedback('click');
          onClose();
        }}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
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
  // `width` is set inline (LINE_BOX_WIDTH_FRACTION * screen width) - see
  // this file's doc comment. `flexShrink: 0` stops the flex column from
  // ever squeezing a line narrower than that.
  lineBox: {
    alignItems: 'center',
    flexShrink: 0
  },
  line: {
    fontWeight: '900',
    textAlign: 'center',
    flexShrink: 0
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
