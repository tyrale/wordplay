import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { GridCell } from '../GridCell';

function renderCell(props: Partial<React.ComponentProps<typeof GridCell>> = {}) {
  return render(
    <ThemeProvider>
      <GridCell content="A" {...props} />
    </ThemeProvider>
  );
}

describe('native GridCell', () => {
  it('calls onPress on a plain tap for a non-draggable cell', () => {
    const onPress = jest.fn();
    renderCell({ onPress });
    fireEvent.press(screen.getByLabelText('A'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress on a plain tap for a draggable letter cell too', () => {
    const onPress = jest.fn();
    renderCell({ onPress, draggable: true, type: 'letter' });
    fireEvent.press(screen.getByLabelText('A'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('never drags action buttons, even if draggable is passed', () => {
    const onDragStart = jest.fn();
    const onPress = jest.fn();
    renderCell({ onPress, draggable: true, type: 'action', content: '≡' });
    fireEvent.press(screen.getByLabelText('≡'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    renderCell({ onPress, disabled: true, draggable: true });
    fireEvent.press(screen.getByLabelText('A'));
    expect(onPress).not.toHaveBeenCalled();
  });

  /**
   * Regression test for a real bug: PanResponder.create() is only ever
   * invoked once (frozen via useRef after the first render), so its
   * callbacks would otherwise close over whatever `disabled`/`onPress`
   * happened to be on that very first render *forever* - e.g. a cell
   * that starts disabled (common during a screen's async startup) would
   * stay permanently non-tappable even once re-rendered as enabled. Caught
   * via `fireEvent.press` silently doing nothing after the component
   * re-rendered with new props - see GridCell.tsx's `latestRef` fix.
   */
  it('regression: stays tappable after re-rendering from disabled to enabled (no stale PanResponder closure)', () => {
    const onPress = jest.fn();
    const { rerender } = renderCell({ onPress, disabled: true, draggable: true });

    rerender(
      <ThemeProvider>
        <GridCell content="A" onPress={onPress} disabled={false} draggable />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByLabelText('A'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
