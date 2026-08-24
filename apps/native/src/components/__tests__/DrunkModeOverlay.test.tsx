import React from 'react';
import { Animated, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider, useUnlockSystem } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { DrunkModeOverlay } from '../DrunkModeOverlay';

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

function renderOverlay(unlockWords: string[] = []) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <MechanicsSettingsProvider>
            <Unlocker words={unlockWords} />
            <DrunkModeOverlay>
              <Text>content</Text>
            </DrunkModeOverlay>
          </MechanicsSettingsProvider>
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

describe('native DrunkModeOverlay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders children directly, with no wobble transform, when drunk mode is not unlocked', async () => {
    const { UNSAFE_queryAllByType } = renderOverlay();
    await waitFor(() => expect(screen.getByText('content')).toBeTruthy());

    expect(UNSAFE_queryAllByType(Animated.View)).toHaveLength(0);
  });

  it('applies a looping wobble transform once drunk mode is unlocked and toggled on (defaults on once unlocked)', async () => {
    const { UNSAFE_getByType } = renderOverlay(['drunk']);
    await waitFor(() => expect(screen.getByText('content')).toBeTruthy());

    await waitFor(() => {
      const wobbleView = UNSAFE_getByType(Animated.View);
      const flattenedStyle = [wobbleView.props.style].flat();
      const hasTransform = flattenedStyle.some(s => s && typeof s === 'object' && 'transform' in s);
      expect(hasTransform).toBe(true);
    });
  });
});
