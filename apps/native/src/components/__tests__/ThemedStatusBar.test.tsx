import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedStatusBar } from '../ThemedStatusBar';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import { availableThemes } from '@wordplay/theme/theme';

jest.mock('expo-status-bar', () => ({
  StatusBar: jest.fn(() => null)
}));

function Harness({ themeName, inverted }: { themeName: string; inverted?: boolean }) {
  const { setTheme, setInverted } = useTheme();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    setTheme(availableThemes.find(t => t.name === themeName)!);
    if (inverted) setInverted(true);
    setReady(true);
  }, [themeName, inverted, setTheme, setInverted]);
  if (!ready) return null;
  return <ThemedStatusBar />;
}

function renderWithTheme(themeName: string, inverted?: boolean) {
  return render(
    <ThemeProvider>
      <Harness themeName={themeName} inverted={inverted} />
    </ThemeProvider>
  );
}

describe('native ThemedStatusBar', () => {
  beforeEach(() => {
    (StatusBar as unknown as jest.Mock).mockClear();
  });

  it('uses dark content for a light theme background (Classic Blue, #ffffff)', () => {
    renderWithTheme('Classic Blue');
    const props = (StatusBar as unknown as jest.Mock).mock.calls.at(-1)![0];
    expect(props.style).toBe('dark');
  });

  it('uses light content for a dark theme background (midnight, #3A506B)', () => {
    renderWithTheme('midnight');
    const props = (StatusBar as unknown as jest.Mock).mock.calls.at(-1)![0];
    expect(props.style).toBe('light');
  });

  it('respects inversion (swapped background) when computing content style', () => {
    renderWithTheme('Classic Blue', true);
    const props = (StatusBar as unknown as jest.Mock).mock.calls.at(-1)![0];
    // 'Classic Blue' inverted swaps its light (#ffffff) background for
    // its dark (#1e3a8a) text color - status bar content should flip to
    // light accordingly.
    expect(props.style).toBe('light');
  });
});
