import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AlertOverlay } from '../AlertOverlay';

describe('AlertOverlay', () => {
  it('renders stacked lines when visible', () => {
    const mockOnClose = vi.fn();

    render(
      <AlertOverlay
        isVisible={true}
        lines={['WELL', 'DONE', 'NERD']}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('WELL')).toBeInTheDocument();
    expect(screen.getByText('DONE')).toBeInTheDocument();
    expect(screen.getByText('NERD')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const mockOnClose = vi.fn();

    render(
      <AlertOverlay
        isVisible={false}
        lines={['WELL', 'DONE', 'NERD']}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('WELL')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const mockOnClose = vi.fn();

    render(
      <AlertOverlay
        isVisible={true}
        lines={['NICE', 'TRY', 'LOSER']}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders optional meta content', () => {
    const mockOnClose = vi.fn();

    render(
      <AlertOverlay
        isVisible={true}
        lines={['WELL', 'DONE', 'NERD']}
        onClose={mockOnClose}
        meta={<div>You: 25</div>}
      />
    );

    expect(screen.getByText('You: 25')).toBeInTheDocument();
  });

  it('renders optional action buttons alongside the close button', () => {
    const mockOnClose = vi.fn();
    const mockAction = vi.fn();

    render(
      <AlertOverlay
        isVisible={true}
        lines={['CHALLENGE', 'COMPLETE']}
        onClose={mockOnClose}
        actions={[{ label: 'share', onClick: mockAction }]}
      />
    );

    fireEvent.click(screen.getByText('share'));
    expect(mockAction).toHaveBeenCalledTimes(1);

    // Close button remains present alongside actions
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});
