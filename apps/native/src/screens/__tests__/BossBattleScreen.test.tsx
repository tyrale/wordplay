import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { BossBattleScreen } from '../BossBattleScreen';

function renderBoss(props: Partial<React.ComponentProps<typeof BossBattleScreen>> = {}) {
  const onExit = props.onExit ?? jest.fn();
  return {
    onExit,
    ...render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <BossBattleScreen onExit={onExit} {...props} />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    )
  };
}

describe('native BossBattleScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows the intro overlay first, applies the boss theme, and starts the battle once dismissed', async () => {
    let capturedTheme: string | undefined;
    function ThemeSpy() {
      const { currentTheme } = useTheme();
      capturedTheme = currentTheme.name;
      return null;
    }

    render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <ThemeSpy />
                <BossBattleScreen onExit={jest.fn()} />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByText('BOSS')).toBeTruthy());
    expect(screen.getByText('BATTLE')).toBeTruthy();
    await waitFor(() => expect(capturedTheme).toBe('boss'));

    // No game board is mounted yet during the intro.
    expect(screen.queryByLabelText('Reset word')).toBeNull();

    fireEvent.press(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
  });

  it('shows a real bossbot game once the battle starts, with a whole-game countdown', async () => {
    renderBoss();
    await waitFor(() => expect(screen.getByText('BOSS')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Close'));

    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    // 130s countdown for the first stage (BOSS_STAGES.boss.timeLimitSeconds).
    await waitFor(() => expect(screen.getByText('130s')).toBeTruthy());
  });

  it('resigning mid-battle shows the defeat overlay and reverts the theme on exit', async () => {
    const { onExit } = renderBoss();
    await waitFor(() => expect(screen.getByText('BOSS')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('resign')).toBeTruthy());
    fireEvent.press(screen.getByText('resign'));

    await waitFor(() => expect(screen.getByText('BOSS')).toBeTruthy());
    expect(screen.getByText('WINS')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('the "\u2190" back action ends the whole encounter immediately (no ceremony) and calls onExit', async () => {
    const { onExit } = renderBoss();
    await waitFor(() => expect(screen.getByText('BOSS')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Return to home screen'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
