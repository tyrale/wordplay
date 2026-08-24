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

  it('caps the size for very short lines relative to the frame height', () => {
    // A wide-but-short overlay: width alone would suggest a huge font, but
    // the height-based cap (30% of 500, matching web's MAX_FONT_SIZE_VH_FRACTION
    // exactly - a flat per-line cap, not divided by how many lines there
    // are, since this is now only a *starting guess* for FitLine's real
    // onTextLayout-based measurement to correct, not the final answer).
    const size = estimateFontSize('A', 2000, 500);
    expect(size).toBeLessThanOrEqual(500 * 0.3);
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

  /**
   * The headline's actual "fills to the edge" behavior - unlike web
   * (which measures via canvas synchronously before ever painting), this
   * renders once at a heuristic guess, then corrects using the *real*
   * rendered width once React Native reports it via `onTextLayout`. This
   * confirms that correction actually happens: if the real render came
   * out much wider or narrower than the initial guess assumed, the font
   * size should change to compensate, converging toward actually filling
   * the target width rather than just guessing at it forever.
   */
  it('corrects the headline font size once the real rendered width is known, rather than trusting the initial estimate forever', () => {
    renderOverlay({ lines: ['HELLO'] });
    const line = screen.getByText('HELLO');
    const initialFontSize = (line.props.style as { fontSize: number }[]).find(s => 'fontSize' in s)?.fontSize;
    expect(typeof initialFontSize).toBe('number');

    // Report a rendered width far narrower than the initial guess assumed
    // (as if the real system font is much narrower per-character than the
    // AVG_CHAR_WIDTH_RATIO heuristic guessed) - the corrected font size
    // should grow to compensate, not stay at the original guess.
    fireEvent(line, 'textLayout', { nativeEvent: { lines: [{ width: 10, x: 0, y: 0, height: 20 }] } });

    const correctedFontSize = (screen.getByText('HELLO').props.style as { fontSize: number }[]).find(
      s => 'fontSize' in s
    )?.fontSize;
    expect(correctedFontSize).toBeGreaterThan(initialFontSize as number);
  });

  it('does not re-correct the font size on a second textLayout event (measures once per mount)', () => {
    renderOverlay({ lines: ['HELLO'] });
    const line = screen.getByText('HELLO');

    fireEvent(line, 'textLayout', { nativeEvent: { lines: [{ width: 10, x: 0, y: 0, height: 20 }] } });
    const afterFirst = (screen.getByText('HELLO').props.style as { fontSize: number }[]).find(s => 'fontSize' in s)
      ?.fontSize;

    fireEvent(screen.getByText('HELLO'), 'textLayout', {
      nativeEvent: { lines: [{ width: 999, x: 0, y: 0, height: 20 }] }
    });
    const afterSecond = (screen.getByText('HELLO').props.style as { fontSize: number }[]).find(
      s => 'fontSize' in s
    )?.fontSize;

    expect(afterSecond).toBe(afterFirst);
  });

  /**
   * Regression test for a real-device bug: a short line (e.g. "THE")
   * could hit the MAX_FONT_SIZE_VH_FRACTION cap on its very first,
   * uncorrected render. If that render then wrapped or truncated
   * (`numberOfLines={1}` + a too-narrow box), `onTextLayout` measured
   * the wrapped/truncated width instead of the line's real width, which
   * fed the correction formula a bogus, way-too-small number and made
   * the "corrected" font size balloon even larger - rendering the line
   * as an enormous, cut-off single letter that bled into neighboring
   * lines. Guards both halves of the fix: no `numberOfLines` at all, and
   * a layout box wide enough to hold even a short line's biggest
   * possible (cap-hitting) initial guess without constraining it.
   */
  it('never truncates or wraps a headline line, even a short one whose initial guess hits the max font-size cap', () => {
    renderOverlay({ lines: ['ALWAYS', 'THE', 'QUITTER'], variant: 'lose' });

    const shortLine = screen.getByText('THE');
    expect(shortLine.props.numberOfLines).toBeUndefined();

    // The wrapping box (the line's parent) must be comfortably wider
    // than the screen so a short, cap-hitting line's uncorrected first
    // render - which can span multiple screen-widths - never gets
    // force-wrapped/truncated before the real measurement/correction
    // in `onTextLayout` gets a chance to run.
    let box = shortLine.parent;
    while (box && !(box.type === 'View' && [box.props.style].flat().some(s => s && typeof s === 'object' && 'width' in s))) {
      box = box.parent;
    }
    const boxWidth = (
      [box?.props.style].flat().find(s => s && typeof s === 'object' && 'width' in s) as { width: number } | undefined
    )?.width;
    expect(boxWidth).toBeGreaterThan(1000);
  });
});
