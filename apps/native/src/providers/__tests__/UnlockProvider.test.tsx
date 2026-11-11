import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider, useUnlockSystem } from '../UnlockProvider';

// Mocked per-test (not globally) so most tests keep exercising the real
// no-Supabase-configured path (percent == null) - only the rarity test
// below needs a non-null community count/total.
jest.mock('../../adapters/nativeCommunityUnlocksAdapter', () => {
  const actual = jest.requireActual('../../adapters/nativeCommunityUnlocksAdapter');
  return { ...actual, recordCommunityUnlock: jest.fn(actual.recordCommunityUnlock) };
});
import { recordCommunityUnlock } from '../../adapters/nativeCommunityUnlocksAdapter';

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
        <AlertProvider>
          <UnlockProvider>
            <Probe onReady={ctx => { latestCtx = ctx; }} />
          </UnlockProvider>
        </AlertProvider>
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
        <AlertProvider>
          <UnlockProvider>
            <Probe onReady={ctx => { latestCtx = ctx; }} />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(latestCtx?.isLoading).toBe(false));

    let results;
    await act(async () => {
      results = await latestCtx!.handleGameCompletion('human', 'basicBot');
    });

    expect(results!.length).toBeGreaterThan(0);
  });

  it('shows a real AlertOverlay (not a toast) with the unlock copy when a theme is unlocked', async () => {
    let latestCtx: ReturnType<typeof useUnlockSystem> | undefined;

    render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <Probe onReady={ctx => { latestCtx = ctx; }} />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(latestCtx?.isLoading).toBe(false));

    await act(async () => {
      await latestCtx!.handleWordSubmission('green');
    });

    // alertCopy.unlocks.theme: ['NEW', 'THEME', '{item}'] with item=GREEN
    await waitFor(() => expect(screen.getByText('NEW')).toBeTruthy());
    expect(screen.getByText('THEME')).toBeTruthy();
    expect(screen.getByText('GREEN')).toBeTruthy();
    expect(screen.getByText('Now available in the menu')).toBeTruthy();

    // The alert is a full-screen overlay, dismissed via its own close button.
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });

  it('shows a theme unlock alert with community rarity text without a <Text> nesting error', async () => {
    // Regression test: `meta` used to leak raw `{percent}% found` text
    // nodes directly under a <View> whenever community rarity data was
    // present, throwing RN's "Text strings must be rendered within a
    // <Text> component" error - reproduced here by mocking a non-null
    // community count/total onto the theme unlock result.
    (recordCommunityUnlock as jest.Mock).mockResolvedValueOnce({ count: 3, totalPlayers: 12 });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    let latestCtx: ReturnType<typeof useUnlockSystem> | undefined;

    render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <Probe onReady={ctx => { latestCtx = ctx; }} />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(latestCtx?.isLoading).toBe(false));

    await act(async () => {
      await latestCtx!.handleWordSubmission('blue');
    });

    await waitFor(() => expect(screen.getByText(/25% found/)).toBeTruthy());
    expect(screen.getByText(/Now available in the menu/)).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('Text strings must be rendered within a <Text> component'));

    consoleError.mockRestore();
  });

  it('shows the special-cased dark mode alert copy for the dark-mode unlock', async () => {
    let latestCtx: ReturnType<typeof useUnlockSystem> | undefined;

    render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <Probe onReady={ctx => { latestCtx = ctx; }} />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(latestCtx?.isLoading).toBe(false));

    await act(async () => {
      await latestCtx!.handleWordSubmission('tyrale');
    });

    await waitFor(() => expect(screen.getByText('HELL')).toBeTruthy());
    expect(screen.getByText('YES')).toBeTruthy();
    expect(screen.getByText('BITCH')).toBeTruthy();
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
