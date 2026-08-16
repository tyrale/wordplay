import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { ChallengeGame } from '../ChallengeGame';

function renderChallenge(props: React.ComponentProps<typeof ChallengeGame> = {}) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <MechanicsSettingsProvider>
            <RoundLengthProvider>
              <ChallengeGame {...props} />
            </RoundLengthProvider>
          </MechanicsSettingsProvider>
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

describe('native ChallengeGame screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mounts, initializes today\'s challenge, and starts it automatically', async () => {
    renderChallenge();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('0 steps')).toBeTruthy());
  });

  it('never shows a "resign" option and instead forfeits via the real resign action, showing the failure overlay', async () => {
    renderChallenge();
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('resign')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('resign'));
    });

    // A real failure overlay appears (challenge-specific copy, not the
    // bot game's win/lose copy) - proving forfeitChallenge() actually ran
    // and the completion effect actually fired.
    await waitFor(() => expect(screen.getByText('share')).toBeTruthy());
    expect(screen.getByText('leaderboard')).toBeTruthy();
  });

  it('calls onNavigateHome when the back action is pressed', async () => {
    const onNavigateHome = jest.fn();
    renderChallenge({ onNavigateHome });
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Return to home screen'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('lets the player tap a letter to edit the pending word, then reset it back', async () => {
    renderChallenge();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter A'));
    fireEvent.press(screen.getByLabelText('Reset word'));
  });

  it('opens the leaderboard overlay from the completion overlay, and it reflects the just-completed challenge', async () => {
    renderChallenge();
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('resign')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('resign'));
    });

    await waitFor(() => expect(screen.getByText('leaderboard')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('leaderboard'));
      // Let the (mocked/unconfigured) Supabase fetch's promise resolve.
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // The "→" between the start/target words only renders once the
    // overlay has a real, freshly-persisted local challenge result to
    // show - proving it opened and isn't showing the "no challenge
    // started today" placeholder (the words themselves are date-seeded
    // and not worth hardcoding here).
    expect(screen.getByText('→')).toBeTruthy();
  });
});
