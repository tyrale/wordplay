import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { ZenGame } from '../ZenGame';

function renderZen(props: React.ComponentProps<typeof ZenGame> = {}) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <MechanicsSettingsProvider>
            <RoundLengthProvider>
              <ZenGame {...props} />
            </RoundLengthProvider>
          </MechanicsSettingsProvider>
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

describe('native ZenGame screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mounts, initializes, and starts automatically (no bot, no ceremony)', async () => {
    renderZen();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
  });

  it('never shows a "resign" option in its Menu (there is no opponent)', async () => {
    renderZen();
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('home')).toBeTruthy());
    expect(screen.queryByText('resign')).toBeNull();
  });

  it('calls onNavigateHome when the back action is pressed', async () => {
    const onNavigateHome = jest.fn();
    renderZen({ onNavigateHome });
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Return to home screen'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('lets the player tap a letter to edit the pending word, then reset it back', async () => {
    renderZen();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter A'));
    fireEvent.press(screen.getByLabelText('Reset word'));
  });

  it('never finishes (no round limit) - stays active/editable turn after turn', async () => {
    renderZen();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    const submit = await screen.findByLabelText('Word is invalid - tap to pass turn');
    await act(async () => {
      fireEvent.press(submit);
    });

    // Still playable after passing - the grid remains interactive rather
    // than the screen showing a game-over state.
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    expect(screen.getByLabelText('Letter A')).toBeTruthy();
  });
});
