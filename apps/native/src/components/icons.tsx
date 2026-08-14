/**
 * Native-specific icon set for the action glyphs previously rendered as
 * plain Unicode characters (←, ↻, ≡, ×, ✓) in Text components.
 *
 * Why this exists: apps/web renders these as plain text characters too,
 * relying on the browser's consistent system-font glyph coverage for
 * these symbols. React Native has no such guarantee across platforms -
 * on Android, several of these code points (U+2190 back arrow, U+21BB
 * clockwise-open-circle-arrow, U+2261 identical-to/hamburger, U+00D7
 * multiplication sign used as a close "x") fall back to a different
 * system font (e.g. Android's Noto Sans Symbols) than the one used for
 * ordinary text, producing an inconsistent style/weight mismatch with
 * the rest of the UI - a mismatch this port's user found on-device
 * (iOS's SF fonts happen to have broad enough glyph coverage to mask the
 * same underlying issue). Rendering these as explicit vector icons
 * (react-native-svg, already used for LockIcon) guarantees pixel-
 * identical rendering on both platforms instead of relying on whichever
 * fallback font each platform happens to pick.
 *
 * '?' (help) and '✓'... wait, '✓' is included below too since it had the
 * same class of problem; ordinary ASCII characters (letters, digits, the
 * literal '?') are unaffected and remain plain Text elsewhere.
 */
import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

export interface IconProps {
  size: number;
  color: string;
}

/** Simple left-pointing chevron - the '←' back/home action. */
export const BackIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 4 L7 12 L15 20" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/** Circular refresh arrow - the '↻' reset-word action. */
export const ResetIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

/** Three horizontal bars - the '≡' settings menu action. */
export const MenuIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

/** An 'X' - close/invalid-word actions (AlertOverlay's close button, SubmitButton's invalid state). */
export const CloseIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={5} y1={5} x2={19} y2={19} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={19} y1={5} x2={5} y2={19} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

/** A checkmark - SubmitButton's valid-word state. */
export const CheckIcon: React.FC<IconProps> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12.5 L9.5 18 L20 6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);
