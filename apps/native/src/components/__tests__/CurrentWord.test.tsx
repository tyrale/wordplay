import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { CurrentWord } from '../CurrentWord';
import type { CurrentWordHandle } from '../CurrentWord';

describe('native CurrentWord', () => {
  it('renders each letter and exposes an accessible label for the whole word', async () => {
    render(
      <ThemeProvider>
        <CurrentWord word="CAT" />
      </ThemeProvider>
    );
    expect(await screen.findByLabelText('Current word: CAT')).toBeTruthy();
  });

  it('tapping a letter calls onLetterPress with its index (removal)', async () => {
    const onLetterPress = jest.fn();
    render(
      <ThemeProvider>
        <CurrentWord word="CAT" onLetterPress={onLetterPress} />
      </ThemeProvider>
    );
    await screen.findByLabelText('Current word: CAT');

    fireEvent.press(screen.getByLabelText('Remove letter A'));
    expect(onLetterPress).toHaveBeenCalledWith(1);
  });

  it('does not make a locked letter tappable, even with onLetterPress provided', async () => {
    render(
      <ThemeProvider>
        <CurrentWord word="CAT" onLetterPress={jest.fn()} highlights={[{ index: 0, type: 'locked' }]} />
      </ThemeProvider>
    );
    await screen.findByLabelText('Current word: CAT');
    expect(screen.queryByLabelText('Remove letter C')).toBeNull();
  });

  it('exposes measureInWindow via ref for the caller to use as a drop-zone check', async () => {
    const ref = React.createRef<CurrentWordHandle>();
    render(
      <ThemeProvider>
        <CurrentWord ref={ref} word="CAT" />
      </ThemeProvider>
    );
    await screen.findByLabelText('Current word: CAT');

    expect(typeof ref.current?.measureInWindow).toBe('function');
    // Doesn't throw even in the test environment's layout engine (0x0
    // bounds are fine - callers only care that a callback fires).
    const callback = jest.fn();
    expect(() => ref.current?.measureInWindow(callback)).not.toThrow();
  });
});
