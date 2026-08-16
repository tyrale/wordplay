import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { LeaderboardOverlay } from '../LeaderboardOverlay';
import { getTodayChallengeDate } from '../../hooks/useChallengeLeaderboard';

function renderOverlay(props: Partial<React.ComponentProps<typeof LeaderboardOverlay>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <LeaderboardOverlay isVisible onClose={onClose} {...props} />
      </ThemeProvider>
    )
  };
}

describe('native LeaderboardOverlay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders nothing when not visible', async () => {
    renderOverlay({ isVisible: false });
    await waitFor(() => {});
    expect(screen.queryByText('leaderboard')).toBeNull();
  });

  it('shows "no challenge started today" when no local state has been persisted', async () => {
    renderOverlay();
    await waitFor(() => expect(screen.getByText('leaderboard')).toBeTruthy());
    expect(screen.getByText('no challenge started today')).toBeTruthy();
  });

  it("shows today's challenge words once a local result is persisted", async () => {
    const date = getTodayChallengeDate();
    await AsyncStorage.setItem(
      `wordplay-challenge-${date}`,
      JSON.stringify({ date, startWord: 'CAT', targetWord: 'DOG', completed: false, stepCount: 0 })
    );

    renderOverlay();
    await waitFor(() => expect(screen.getByText('CAT')).toBeTruthy());
    expect(screen.getByText('DOG')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    const { onClose } = renderOverlay();
    await waitFor(() => expect(screen.getByLabelText('Close')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
