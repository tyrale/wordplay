import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider, useUnlockSystem } from '../../providers/UnlockProvider';
import { DictionariesOverlay } from '../DictionariesOverlay';

function renderOverlay(props: Partial<React.ComponentProps<typeof DictionariesOverlay>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <DictionariesOverlay isVisible onClose={onClose} {...props} />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    )
  };
}

describe('native DictionariesOverlay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders nothing when not visible', async () => {
    renderOverlay({ isVisible: false });
    await waitFor(() => {});
    expect(screen.queryByText('dictionaries')).toBeNull();
  });

  it('lists the base dictionaries but not the Dr. Seuss one by default', async () => {
    renderOverlay();
    await waitFor(() => expect(screen.getByText('dictionaries')).toBeTruthy());

    expect(screen.getByText('ENABLE Word List')).toBeTruthy();
    expect(screen.getByText('Slang')).toBeTruthy();
    expect(screen.getByText('Common Proper Nouns')).toBeTruthy();
    expect(screen.getByText('Profanity List')).toBeTruthy();
    expect(screen.queryByText('Dr. Seuss Words')).toBeNull();
  });

  it('calls onClose when the close button is pressed', async () => {
    const { onClose } = renderOverlay();
    await waitFor(() => expect(screen.getByLabelText('Close')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the Dr. Seuss dictionary once seuss-canonical-words is unlocked', async () => {
    function Unlocker() {
      const { checkAchievementTriggers, isLoading } = useUnlockSystem();
      const ranRef = React.useRef(false);
      React.useEffect(() => {
        if (!isLoading && !ranRef.current) {
          ranRef.current = true;
          checkAchievementTriggers('beat_grinch_bot');
        }
      }, [isLoading, checkAchievementTriggers]);
      return null;
    }

    render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <Unlocker />
            <DictionariesOverlay isVisible onClose={jest.fn()} />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    );

    await act(async () => {});
    await waitFor(() => expect(screen.getByText('Dr. Seuss Words')).toBeTruthy());
  });
});
