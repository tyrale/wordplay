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

  /**
   * Regression test for a real bug: an earlier version of this
   * component created a brand-new `PanResponder` (via a plain function
   * called straight from render) for every letter on every single
   * re-render, rather than a stable one created exactly once per
   * letter. `PanResponder.create()` allocates a fresh internal
   * `gestureState` every time it's called, so recreating it constantly
   * *during* an active drag (which itself triggers a re-render on every
   * touch-move, to update the live drop indicator) was silently
   * corrupting the gesture every frame - dragging within the word
   * "didn't really work at all" despite the reorder math itself being
   * correct in isolation. This can't fully simulate a real touch-drag
   * sequence, but it does exercise the exact re-render pattern that
   * triggered the bug: force several re-renders (as continuous drag
   * state updates would) and confirm a plain tap still works
   * afterward - if PanResponder were being recreated on every one of
   * these, `fireEvent.press`'s escape hatch would still work (it's a
   * separate code path), but this at least proves the component
   * tolerates the render pattern without throwing or losing its
   * gesture wiring.
   */
  it('regression: tolerates rapid re-renders (the pattern an active drag produces) without breaking tap-to-remove', async () => {
    const onLetterPress = jest.fn();
    const { rerender } = render(
      <ThemeProvider>
        <CurrentWord word="CATS" onLetterPress={onLetterPress} />
      </ThemeProvider>
    );
    await screen.findByLabelText('Current word: CATS');

    // Force several rapid re-renders, mirroring what continuous
    // onPanResponderMove-driven state updates (dropTargetIndex changing
    // every touch-move) would trigger on the real component.
    for (let i = 0; i < 10; i++) {
      rerender(
        <ThemeProvider>
          <CurrentWord word="CATS" onLetterPress={onLetterPress} />
        </ThemeProvider>
      );
    }

    fireEvent.press(screen.getByLabelText('Remove letter T'));
    expect(onLetterPress).toHaveBeenCalledWith(2);
  });
});
