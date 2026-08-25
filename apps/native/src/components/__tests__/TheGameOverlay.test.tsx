import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { TheGameOverlay } from '../TheGameOverlay';

function renderOverlay(props: Partial<React.ComponentProps<typeof TheGameOverlay>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <TheGameOverlay isVisible onClose={onClose} {...props} />
      </ThemeProvider>
    )
  };
}

describe('native TheGameOverlay', () => {
  it('renders nothing when not visible', async () => {
    renderOverlay({ isVisible: false });
    await waitFor(() => {});
    expect(screen.queryByText('the game')).toBeNull();
  });

  it('describes the game', async () => {
    renderOverlay();
    await waitFor(() => expect(screen.getByText('the game')).toBeTruthy());
    expect(screen.getByText(/word game about finding as many words/)).toBeTruthy();
    expect(screen.getByText(/side project made in my spare time/)).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    const { onClose } = renderOverlay();
    await waitFor(() => expect(screen.getByLabelText('Close')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
