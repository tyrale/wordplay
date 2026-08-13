import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertOverlay, estimateFontSize } from '../AlertOverlay';

function renderOverlay(props: Partial<React.ComponentProps<typeof AlertOverlay>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <AlertOverlay isVisible lines={['HELLO']} onClose={onClose} {...props} />
      </ThemeProvider>
    )
  };
}

describe('estimateFontSize', () => {
  it('is deterministic for the same inputs', () => {
    expect(estimateFontSize('HELLO', 400, 800)).toBe(estimateFontSize('HELLO', 400, 800));
  });

  it('gives shorter lines a larger font size than longer lines at the same width', () => {
    const short = estimateFontSize('HI', 400, 800);
    const long = estimateFontSize('SUPERLONGWORD', 400, 800);
    expect(short).toBeGreaterThan(long);
  });

  it('never returns a size below the minimum, even for very long lines', () => {
    const size = estimateFontSize('A'.repeat(200), 300, 600);
    expect(size).toBeGreaterThanOrEqual(24);
  });

  it('caps the size for very short lines relative to overlay height', () => {
    // A wide-but-short overlay: width alone would suggest a huge font, but
    // the height-based cap (16% of 500 = 80) should bind instead.
    const size = estimateFontSize('A', 2000, 500);
    expect(size).toBeLessThanOrEqual(500 * 0.16);
  });
});

describe('native AlertOverlay', () => {
  it('renders nothing when not visible', () => {
    renderOverlay({ isVisible: false });
    expect(screen.queryByText('HELLO')).toBeNull();
  });

  it('renders lines uppercased and calls onClose when the close button is pressed', () => {
    const { onClose } = renderOverlay({ lines: ['hello', 'world'] });

    expect(screen.getByText('HELLO')).toBeTruthy();
    expect(screen.getByText('WORLD')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not uppercase lines for the "start" variant', () => {
    renderOverlay({ lines: ['reword'], variant: 'start' });
    expect(screen.getByText('reword')).toBeTruthy();
  });

  it('renders string meta text', () => {
    renderOverlay({ meta: 'Now available in the menu' });
    expect(screen.getByText('Now available in the menu')).toBeTruthy();
  });

  it('renders custom ReactNode meta', () => {
    renderOverlay({ meta: <Text>Custom meta node</Text> });
    expect(screen.getByText('Custom meta node')).toBeTruthy();
  });

  it('renders actions and calls their onPress handlers', () => {
    const onPress = jest.fn();
    renderOverlay({ actions: [{ label: 'Share', onPress }] });

    fireEvent.press(screen.getByText('Share'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
