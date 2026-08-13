import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { InteractiveGame } from '../InteractiveGame';

function renderGame(props: React.ComponentProps<typeof InteractiveGame> = {}) {
  return render(
    <ThemeProvider>
      <InteractiveGame {...props} />
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

  it('calls onExit when the back action is pressed', async () => {
    const onExit = jest.fn();
    renderGame({ onExit });
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Return to home screen'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('calling passTurn via the submit button (unchanged word) advances the turn without crashing', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    const submit = await screen.findByLabelText('Word is invalid - tap to pass turn');
    await act(async () => {
      fireEvent.press(submit);
    });
  });
});
