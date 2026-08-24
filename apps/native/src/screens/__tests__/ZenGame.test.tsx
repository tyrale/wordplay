import React from 'react';
import { Animated } from 'react-native';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider, useUnlockSystem } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { ZenGame } from '../ZenGame';

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

function renderZen(props: React.ComponentProps<typeof ZenGame> = {}, unlockWords: string[] = []) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <MechanicsSettingsProvider>
            <RoundLengthProvider>
              <Unlocker words={unlockWords} />
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

  it('shows a dictionary/help overlay (word + legality reason + definition) when "Help" is pressed', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ meanings: [{ definitions: [{ definition: 'a fake test definition' }] }] }]
    });

    try {
      renderZen();
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

  it('does not apply a wobble transform when drunk mode is not unlocked', async () => {
    const { UNSAFE_getByType } = renderZen();
    await waitFor(() => expect(screen.getByLabelText(/^Current word: .+/)).toBeTruthy());

    const wobbleView = UNSAFE_getByType(Animated.View);
    const flattenedStyle = [wobbleView.props.style].flat();
    expect(flattenedStyle.some(s => s && typeof s === 'object' && 'transform' in s)).toBe(false);
  });

  it('applies a looping wobble transform once drunk mode is unlocked and toggled on (defaults on once unlocked)', async () => {
    const { UNSAFE_getByType } = renderZen({}, ['drunk']);
    await waitFor(() => expect(screen.getByLabelText(/^Current word: .+/)).toBeTruthy());

    await waitFor(() => {
      const wobbleView = UNSAFE_getByType(Animated.View);
      const flattenedStyle = [wobbleView.props.style].flat();
      expect(flattenedStyle.some(s => s && typeof s === 'object' && 'transform' in s)).toBe(true);
    });
  });

  it('does not show a countdown when time-pressure is unlocked but left off (the default)', async () => {
    renderZen({}, ['time']);
    await waitFor(() => expect(screen.getByLabelText(/^Current word: .+/)).toBeTruthy());
    expect(screen.queryByText('7')).toBeNull();
  });

  it('shows a live per-turn countdown once the time-pressure mechanic is unlocked and toggled on', async () => {
    await AsyncStorage.setItem('wordplay-mechanics-settings', JSON.stringify({ 'time-pressure': true }));
    renderZen({}, ['time']);

    expect(await screen.findByText('7')).toBeTruthy();
  });
});
