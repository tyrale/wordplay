import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, getEffectiveColors } from '../ThemeProvider';
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
});
