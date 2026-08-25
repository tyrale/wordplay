import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider, useUnlockSystem } from '../../providers/UnlockProvider';
import { VanityFilterProvider } from '../../contexts/VanityFilterContext';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { ChallengeGame } from '../ChallengeGame';

function Unlocker({ words }: { words: string[] }) {
  const { checkWordTriggers, isLoading } = useUnlockSystem();
  const ranRef = React.useRef(false);
  React.useEffect(() => {
    if (!isLoading && !ranRef.current) {
      ranRef.current = true;
      words.forEach(word => checkWordTriggers(word));
    }
  }, [isLoading, checkWordTriggers, words]);
  return null;
}

function renderChallenge(props: React.ComponentProps<typeof ChallengeGame> = {}, unlockWords: string[] = []) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <VanityFilterProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <Unlocker words={unlockWords} />
                <ChallengeGame {...props} />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </VanityFilterProvider>
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

  it('calls onSwitchBot (not onReplayTutorial) when a bot is tapped in the Menu\'s "bots" section', async () => {
    const onSwitchBot = jest.fn();
    const onReplayTutorial = jest.fn();
    renderChallenge({ onSwitchBot, onReplayTutorial });
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('bots')).toBeTruthy());
    fireEvent.press(screen.getByText('bots'));
    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    expect(onSwitchBot).toHaveBeenCalledWith('basicBot');
    expect(onReplayTutorial).not.toHaveBeenCalled();
  });

  it('calls onReplayTutorial (not onSwitchBot) from the Menu\'s "the basics" entry', async () => {
    const onSwitchBot = jest.fn();
    const onReplayTutorial = jest.fn();
    renderChallenge({ onSwitchBot, onReplayTutorial });
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('about')).toBeTruthy());
    fireEvent.press(screen.getByText('about'));
    await waitFor(() => expect(screen.getByText('the basics')).toBeTruthy());
    fireEvent.press(screen.getByText('the basics'));

    expect(onReplayTutorial).toHaveBeenCalledWith('basicBot');
    expect(onSwitchBot).not.toHaveBeenCalled();
  });

  it('shows a dictionary/help overlay (word + legality reason + definition) when "Help" is pressed', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ meanings: [{ definitions: [{ definition: 'a fake test definition' }] }] }]
    });

    try {
      renderChallenge();
      await waitFor(() => expect(screen.getByLabelText(/^Current word: .+/)).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Help'));
      });

      await waitFor(() => expect(screen.getByText('a fake test definition')).toBeTruthy());
    } finally {
      global.fetch = originalFetch;
    }
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
    // and not worth hardcoding here). `getAllByText` (not `getByText`)
    // since WordTrail's own start/target labels underneath the overlay
    // also render a "→".
    expect(screen.getAllByText('→').length).toBeGreaterThan(0);
  });

  // Drunk mode's wobble is wired app-wide via App.tsx's `DrunkModeOverlay`,
  // not per-screen - see DrunkModeOverlay.test.tsx for wobble coverage.
});
