import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { StatsOverlay } from '../StatsOverlay';

function renderOverlay(props: Partial<React.ComponentProps<typeof StatsOverlay>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <StatsOverlay isVisible onClose={onClose} {...props} />
      </ThemeProvider>
    )
  };
}

describe('native StatsOverlay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders nothing when not visible', async () => {
    renderOverlay({ isVisible: false });
    await waitFor(() => {});
    expect(screen.queryByText('stats')).toBeNull();
  });

  it('shows a fresh log with zeroed word/game stats', async () => {
    renderOverlay();
    await waitFor(() => expect(screen.getByText('stats')).toBeTruthy());

    expect(screen.getByText('Words played')).toBeTruthy();
    expect(screen.getByText('Games played')).toBeTruthy();
    // Bots section is empty with no games played yet.
    expect(screen.queryByText('Bots')).toBeNull();
  });

  it('reflects a recorded game result', async () => {
    // usePlayerStats creates its own engine + local React state per
    // consumer; StatsOverlay must mount *after* the write actually
    // persists (a separate consumer recording concurrently wouldn't be
    // reflected in an already-initialized StatsOverlay's own state).
    function Recorder({ onDone }: { onDone: () => void }) {
      const { recordGameResult, isLoading } = usePlayerStats();
      const ranRef = React.useRef(false);
      React.useEffect(() => {
        if (!isLoading && !ranRef.current) {
          ranRef.current = true;
          recordGameResult({
            playerId: 'human',
            botId: 'basicBot',
            won: true,
            tied: false,
            turnHistory: [],
            totalTurns: 3,
            finalScore: 25,
            gameDurationMs: 30000,
            timestamp: Date.now()
          }).then(onDone);
        }
      }, [isLoading, recordGameResult, onDone]);
      return null;
    }

    let recorded = false;
    render(
      <ThemeProvider>
        <Recorder onDone={() => { recorded = true; }} />
      </ThemeProvider>
    );
    await waitFor(() => expect(recorded).toBe(true));

    renderOverlay();
    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    expect(screen.getByText('1W - 0L (1 played)')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    const { onClose } = renderOverlay();
    await waitFor(() => expect(screen.getByLabelText('Close')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
