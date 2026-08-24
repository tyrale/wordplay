import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, getEffectiveColors, getPerceivedLuminance, isLightBackground } from '../ThemeProvider';
import { defaultTheme, availableThemes } from '@wordplay/theme/theme';

function ThemeProbe() {
  const { currentTheme, isLoading, isInverted, setTheme, toggleInverted } = useTheme();
  const redTheme = availableThemes.find(t => t.name === 'red')!;
  return (
    <>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="theme-name">{currentTheme.name}</Text>
      <Text testID="inverted">{String(isInverted)}</Text>
      <Text testID="set-red" onPress={() => setTheme(redTheme)}>set-red</Text>
      <Text testID="toggle-inverted" onPress={toggleInverted}>toggle-inverted</Text>
    </>
  );
}

describe('native ThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts with defaultTheme and isLoading true, then resolves isLoading to false', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-name').props.children).toBe(defaultTheme.name);

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    });
  });

  it('setTheme updates the context and persists to AsyncStorage', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    fireEvent.press(screen.getByTestId('set-red'));

    await waitFor(() => expect(screen.getByTestId('theme-name').props.children).toBe('red'));
    const stored = await AsyncStorage.getItem('wordplay-theme');
    expect(JSON.parse(stored!)).toEqual({ name: 'red' });
  });

  it('restores a previously persisted theme on next mount', async () => {
    await AsyncStorage.setItem('wordplay-theme', JSON.stringify({ name: 'red' }));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByTestId('theme-name').props.children).toBe('red'));
  });

  it('toggleInverted flips isInverted and persists it', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    fireEvent.press(screen.getByTestId('toggle-inverted'));

    await waitFor(() => expect(screen.getByTestId('inverted').props.children).toBe('true'));
    expect(await AsyncStorage.getItem('wordplay-inverted')).toBe('true');
  });
});

describe('getEffectiveColors', () => {
  it('returns the theme colors unchanged when not inverted', () => {
    expect(getEffectiveColors(defaultTheme, false)).toEqual(defaultTheme.colors);
  });

  it('swaps background and text when inverted', () => {
    const inverted = getEffectiveColors(defaultTheme, true);
    expect(inverted.background).toBe(defaultTheme.colors.text);
    expect(inverted.text).toBe(defaultTheme.colors.background);
    // Everything else stays the same.
    expect(inverted.primary).toBe(defaultTheme.colors.primary);
  });

  it('recomputes textSecondary/disabled off the new (inverted) text color, not the original one', () => {
    // textSecondary/disabled are just `text` with alpha transparency
    // appended (see packages/theme/theme.ts's createTheme) - if inversion
    // swapped background/text but left these untouched, they'd still be
    // tinted with the *original* text color, which can render nearly
    // invisible blended into the new, inverted background.
    const inverted = getEffectiveColors(defaultTheme, true);
    expect(inverted.textSecondary).toBe(`${defaultTheme.colors.background}80`);
    expect(inverted.disabled).toBe(`${defaultTheme.colors.background}40`);
  });
});

describe('getPerceivedLuminance/isLightBackground (Phase 5: per-theme status bar)', () => {
  it('computes 0 for pure black and 1 for pure white', () => {
    expect(getPerceivedLuminance('#000000')).toBe(0);
    expect(getPerceivedLuminance('#ffffff')).toBe(1);
  });

  it('supports 3-digit shorthand hex', () => {
    expect(getPerceivedLuminance('#fff')).toBe(1);
    expect(getPerceivedLuminance('#000')).toBe(0);
  });

  it('treats white/light colors as a light background', () => {
    expect(isLightBackground('#ffffff')).toBe(true);
    expect(isLightBackground('#f5f5f5')).toBe(true);
  });

  it('treats black/dark colors as not a light background', () => {
    expect(isLightBackground('#000000')).toBe(false);
    expect(isLightBackground('#1a1a1a')).toBe(false);
  });

  it('every theme background resolves to a definite light/dark answer without throwing', () => {
    for (const theme of availableThemes) {
      expect(() => isLightBackground(theme.colors.background)).not.toThrow();
      expect(typeof isLightBackground(theme.colors.background)).toBe('boolean');
    }
  });
});
