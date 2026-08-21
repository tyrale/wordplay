/**
 * Phase 5 (see docs/project/REACT_NATIVE_PORT_PLAN.md): per-theme status
 * bar styling. Web never has to think about this - the browser chrome's
 * status bar isn't part of the page - but on native the status bar sits
 * directly over the app's own themed background, and with 75 themes
 * spanning both very light and very dark backgrounds, a single static
 * `style="auto"` (which only follows the OS light/dark setting, not this
 * app's own per-theme background) would leave light-icon-on-light-
 * background or dark-icon-on-dark-background combinations unreadable for
 * a lot of themes.
 *
 * Renders nothing itself - `expo-status-bar`'s `<StatusBar>` is a side-
 * effect-only component (no visible tree), so this is really just "call
 * useTheme() and forward the right props to it," kept in a dedicated
 * component so `App.tsx`'s top level doesn't need to touch theme state
 * directly.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useTheme, getEffectiveColors, isLightBackground } from '../theme/ThemeProvider';

export const ThemedStatusBar: React.FC = () => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  // Status bar *content* (icons/clock) should contrast against the
  // background behind it: a light theme background needs dark content,
  // a dark theme background needs light content - inverted from what
  // `isLightBackground` returns, matching expo-status-bar's `style` prop
  // semantics ('dark' = dark content, for light backgrounds).
  const style = isLightBackground(colors.background) ? 'dark' : 'light';

  return (
    <StatusBar
      style={style}
      // Android only (iOS status bar is always transparent over the
      // app) - tints the status bar's own background to match the
      // theme instead of leaving it as whatever the OS default is.
      backgroundColor={colors.background}
    />
  );
};
