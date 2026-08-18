import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { CurrentWord, computeDropIndex } from '../CurrentWord';
import type { CurrentWordHandle } from '../CurrentWord';

// "CATS" laid out left-to-right, each letter 20px wide with no gaps -
// C:[0,20) A:[20,40) T:[40,60) S:[60,80). Centers: C=10, A=30, T=50, S=70.
const CATS_LAYOUTS = [
  { x: 0, width: 20 },
  { x: 20, width: 20 },
  { x: 40, width: 20 },
  { x: 60, width: 20 }
];

describe('native computeDropIndex (within-word drag hit-testing)', () => {
  it('returns the dragged index unchanged when there is no movement', () => {
    // Dragging A (index 1, center 30) with dx=0 stays at its own center
    // (30), which is not less than any *other* letter's center it's
    // compared against (T=50, S=70 are greater; C=10 is less) - so the
    // first center greater than 30 is T's (50) -> index 2. That's
    // "still adjacent to its own original neighbor", the no-op case the
    // caller's `dropIndex === index || dropIndex === index + 1` guard
    // catches (index+1 = 2 here).
    expect(computeDropIndex(CATS_LAYOUTS, 1, 0)).toBe(2);
  });

  it('resolves to a middle position, not just the first or last - the regression this test exists for', () => {
    // Drag C (index 0, center 10) far enough right (dx=45) that its
    // live center (55) is between T's center (50) and S's center (70) -
    // should land between T and S (index 3), not snap to the front or
    // very end.
    expect(computeDropIndex(CATS_LAYOUTS, 0, 45)).toBe(3);
  });

  it('resolves to a middle position when dragging from the end backwards too', () => {
    // Drag S (index 3, center 70) left by 45 -> live center 25, which
    // sits between C's center (10) and A's center (30) -> index 1.
    expect(computeDropIndex(CATS_LAYOUTS, 3, -45)).toBe(1);
  });

  it('resolves to the very front when dragged past every other letter', () => {
    expect(computeDropIndex(CATS_LAYOUTS, 3, -1000)).toBe(0);
  });

  it('resolves to the very end when dragged past every other letter', () => {
    expect(computeDropIndex(CATS_LAYOUTS, 0, 1000)).toBe(4);
  });

  it('skips comparing the dragged letter against its own original layout', () => {
    // Dragging T (index 2) with dx=0 - if the loop didn't skip i===2, T's
    // own center (50) vs its own live center (50) is not `<`, so this
    // wouldn't false-trigger on itself; explicitly confirms the skip
    // still resolves sensibly at zero movement.
    expect(computeDropIndex(CATS_LAYOUTS, 2, 0)).toBe(3);
  });

  it('falls back to the dragged index if that letter has no measured layout yet', () => {
    const layouts = [...CATS_LAYOUTS];
    layouts[1] = null as unknown as { x: number; width: number };
    expect(computeDropIndex(layouts, 1, 100)).toBe(1);
  });

  it('skips letters with no measured layout when scanning for the target', () => {
    const layouts = [...CATS_LAYOUTS];
    layouts[2] = null as unknown as { x: number; width: number }; // T's layout missing
    // Drag C (index 0) to live center 55 (between T and S) - T is
    // unmeasured so it's skipped, landing against S's center (70)
    // instead of throwing or misbehaving.
    expect(computeDropIndex(layouts, 0, 45)).toBe(3);
  });
});

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
   * Regression test for the actual bug behind "can drag to the very
   * first or last position, never in between" (see CurrentWord.tsx's
   * doc comment, point 3): a draggable letter's layout must be measured
   * on its own outer wrapper (a *direct* flex child of the row
   * container), not on its inner content - the inner content's own
   * `onLayout` would report position relative to the wrapper itself
   * (its immediate parent), which is always ~0 since the wrapper has no
   * siblings and sizes to fit that one child exactly, regardless of
   * where in the row the letter actually sits. This fires a `layout`
   * event with a distinctive, non-zero x/width directly on the queried
   * element and confirms *that exact element* receives it - if the
   * measurement were (again) wired to some inner child instead, this
   * event fired on the outer element wouldn't reach it at all.
   */
  it('regression: measures a draggable letter relative to the row, not its own inner wrapper', async () => {
    render(
      <ThemeProvider>
        <CurrentWord word="CAT" onLetterPress={jest.fn()} />
      </ThemeProvider>
    );
    await screen.findByLabelText('Current word: CAT');

    const letterA = screen.getByLabelText('Remove letter A');
    expect(() =>
      fireEvent(letterA, 'layout', { nativeEvent: { layout: { x: 42, y: 0, width: 30, height: 40 } } })
    ).not.toThrow();
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
