import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { ThoughtsOverlay } from '../ThoughtsOverlay';

function renderOverlay(props: Partial<React.ComponentProps<typeof ThoughtsOverlay>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <ThoughtsOverlay isVisible onClose={onClose} {...props} />
      </ThemeProvider>
    )
  };
}

describe('native ThoughtsOverlay', () => {
  it('renders nothing when not visible', async () => {
    renderOverlay({ isVisible: false });
    await waitFor(() => {});
    expect(screen.queryByText(/Dark mode is my favorite/)).toBeNull();
  });

  it('lists the thoughts', async () => {
    renderOverlay();
    await waitFor(() => expect(screen.getByText(/Dark mode is my favorite/)).toBeTruthy());
    expect(screen.getByText(/Unlocks will never alter points/)).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    const { onClose } = renderOverlay();
    await waitFor(() => expect(screen.getByLabelText('Close')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
