import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { UnlockProvider, useUnlockSystem } from '../../providers/UnlockProvider';
import { MainScreen } from '../MainScreen';

function renderMainScreen(props: Partial<React.ComponentProps<typeof MainScreen>> = {}) {
  const onStartGame = props.onStartGame ?? jest.fn();
  return {
    onStartGame,
    ...render(
      <ThemeProvider>
        <UnlockProvider>
          <MainScreen onStartGame={onStartGame} onStartMultiplayer={props.onStartMultiplayer} />
        </UnlockProvider>
      </ThemeProvider>
    )
  };
}

describe('native MainScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows the core game mode options but not zen mode (locked by default)', async () => {
    renderMainScreen();
    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());

    expect(screen.getByText('world')).toBeTruthy();
    expect(screen.getByText('human')).toBeTruthy();
    expect(screen.queryByText('nobody')).toBeNull();
  });

  it('navigating to the bot list and selecting basicBot calls onStartGame with the bot id', async () => {
    const { onStartGame } = renderMainScreen();
    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());

    fireEvent.press(screen.getByText('bot'));

    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    expect(onStartGame).toHaveBeenCalledWith('bot', 'basicBot');
  });

  it('"world" (challenge) calls onStartGame with challenge', async () => {
    const { onStartGame } = renderMainScreen();
    await waitFor(() => expect(screen.getByText('world')).toBeTruthy());

    fireEvent.press(screen.getByText('world'));
    expect(onStartGame).toHaveBeenCalledWith('challenge');
  });

  it('shows a locked message for "human" when no multiplayer handler is provided', async () => {
    renderMainScreen();
    await waitFor(() => expect(screen.getByText('human')).toBeTruthy());

    fireEvent.press(screen.getByText('human'));
    expect(screen.getByText('BEAT\nEASYBOT\nFIRST')).toBeTruthy();
  });

  it('reveals "nobody" (zen mode) once unlocked', async () => {
    function ZenUnlocker() {
      const { checkWordTriggers, isLoading } = useUnlockSystem();
      React.useEffect(() => {
        if (!isLoading) {
          checkWordTriggers('zen');
        }
      }, [isLoading, checkWordTriggers]);
      return null;
    }

    render(
      <ThemeProvider>
        <UnlockProvider>
          <ZenUnlocker />
          <MainScreen onStartGame={jest.fn()} />
        </UnlockProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByText('nobody')).toBeTruthy());
  });
});
