import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import { UnlockProvider, useUnlockSystem } from '../UnlockProvider';

function Probe({ onReady }: { onReady: (ctx: ReturnType<typeof useUnlockSystem>) => void }) {
  const ctx = useUnlockSystem();
  const { currentTheme } = useTheme();
  onReady(ctx);
  return <Text testID="theme-name">{currentTheme.name}</Text>;
}

describe('native UnlockProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('applies an unlocked theme immediately via handleWordSubmission', async () => {
    let latestCtx: ReturnType<typeof useUnlockSystem> | undefined;

    render(
      <ThemeProvider>
        <UnlockProvider>
          <Probe onReady={ctx => { latestCtx = ctx; }} />
        </UnlockProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(latestCtx?.isLoading).toBe(false));

    await act(async () => {
      await latestCtx!.handleWordSubmission('red');
    });

    await waitFor(() => expect(screen.getByTestId('theme-name').props.children).toBe('red'));
    expect(latestCtx!.isUnlocked('theme', 'red')).toBe(true);
  });

  it('handleGameCompletion unlocks a beat-bot achievement on a human win', async () => {
    let latestCtx: ReturnType<typeof useUnlockSystem> | undefined;

    render(
      <ThemeProvider>
        <UnlockProvider>
          <Probe onReady={ctx => { latestCtx = ctx; }} />
        </UnlockProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(latestCtx?.isLoading).toBe(false));

    let results;
    await act(async () => {
      results = await latestCtx!.handleGameCompletion('human', 'basicBot');
    });

    expect(results!.length).toBeGreaterThan(0);
  });

  it('throws if useUnlockSystem is used outside the provider', () => {
    const BadComponent = () => {
      useUnlockSystem();
      return null;
    };
    // Suppress the expected React error boundary console noise for this assertion.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow('useUnlockSystem must be used within an UnlockProvider');
    spy.mockRestore();
  });
});
