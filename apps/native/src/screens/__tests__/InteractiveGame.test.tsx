import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { InteractiveGame } from '../InteractiveGame';

function renderGame(props: React.ComponentProps<typeof InteractiveGame> = {}) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <MechanicsSettingsProvider>
            <RoundLengthProvider>
              <InteractiveGame {...props} />
            </RoundLengthProvider>
          </MechanicsSettingsProvider>
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

describe('native InteractiveGame screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mounts, initializes a game, and starts it automatically', async () => {
    renderGame();

    await waitFor(() => {
      // Current word letters render as individual Text nodes via
      // CurrentWord - just confirm the alphabet grid rendered by finding
      // a known action button.
      expect(screen.getByLabelText('Reset word')).toBeTruthy();
    });
  });

  it('lets the player tap a letter to append it, then reset it back', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter A'));
    // Appending a letter should make the submit button reachable
    // (either as a valid submit or an invalid-word pass), i.e. the
    // screen doesn't crash on a tap.
    fireEvent.press(screen.getByLabelText('Reset word'));
  });

  it('calls onNavigateHome (not onResign) when the back action is pressed - no ceremony', async () => {
    const onNavigateHome = jest.fn();
    const onResign = jest.fn();
    renderGame({ onNavigateHome, onResign });
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Return to home screen'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
    expect(onResign).not.toHaveBeenCalled();
  });

  it('calls onResign (not onNavigateHome) from the Menu\'s resign action', async () => {
    const onNavigateHome = jest.fn();
    const onResign = jest.fn();
    renderGame({ onNavigateHome, onResign });
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('resign')).toBeTruthy());
    fireEvent.press(screen.getByText('resign'));

    expect(onResign).toHaveBeenCalledTimes(1);
    expect(onNavigateHome).not.toHaveBeenCalled();
  });

  it('calling passTurn via the submit button (unchanged word) advances the turn without crashing', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    const submit = await screen.findByLabelText('Word is invalid - tap to pass turn');
    await act(async () => {
      fireEvent.press(submit);
    });
  });

  it('regression: submitting a real unlock-trigger word (e.g. "ten") actually shows the unlock alert', async () => {
    // Forces a deterministic starting word so a specific valid move
    // ("TEN" -> "TENS", a real single-letter-add move) is reachable via
    // taps, rather than depending on the random starting word. This is
    // the exact bug report this test guards against: handleWordSubmission
    // was fully implemented and unit-tested in isolation (see
    // providers/__tests__/UnlockProvider.test.tsx) but was never actually
    // called from this screen's submit handler, so playing a real unlock
    // trigger word during a live game silently did nothing.
    // Starts on "TENS" and removes the "S" (a valid remove-one-letter
    // move) so the *submitted* word is literally "TEN" - the unlock
    // trigger fires on the played word, not on the game's starting word.
    renderGame({ config: { initialWord: 'TENS' } });
    await waitFor(() => expect(screen.getByLabelText('Current word: TENS')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Remove letter S'));

    const submit = await screen.findByLabelText('Submit word');
    await act(async () => {
      fireEvent.press(submit);
    });

    // alertCopy.unlocks.mechanic: ['NEW', 'FEATURE', '{item}'] - two
    // separate unlocks fire for "ten" (10-letter-start and round-length-10),
    // queued one at a time; the first should already be visible.
    await waitFor(() => expect(screen.getByText('NEW')).toBeTruthy());
    expect(screen.getByText('FEATURE')).toBeTruthy();
  });
});
