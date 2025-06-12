/**
 * Toast Component Tests
 * 
 * Tests the toast notification component functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastManager';

// Test component that uses the toast system
function TestToastComponent() {
  const { showToast, showUnlockToast } = useToast();

  return (
    <div>
      <button 
        data-testid="show-unlock-toast"
        onClick={() => showUnlockToast('theme', 'Red')}
      >
        Show Unlock Toast
      </button>
      <button 
        data-testid="show-info-toast"
        onClick={() => showToast({
          type: 'info',
          title: 'Test Info',
          message: 'This is a test message',
          duration: 1000
        })}
      >
        Show Info Toast
      </button>
    </div>
  );
}

describe('Toast System', () => {
  it('should show unlock toast notification', async () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );

    // Click button to show unlock toast
    fireEvent.click(screen.getByTestId('show-unlock-toast'));

    // Should show the unlock toast
    await waitFor(() => {
      expect(screen.getByText('Theme Unlocked!')).toBeInTheDocument();
      expect(screen.getByText('You\'ve unlocked "Red". Check it out in the menu!')).toBeInTheDocument();
    });

    // Should have the unlock icon
    expect(screen.getByText('🎉')).toBeInTheDocument();
  });

  it('should show info toast notification', async () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );

    // Click button to show info toast
    fireEvent.click(screen.getByTestId('show-info-toast'));

    // Should show the info toast
    await waitFor(() => {
      expect(screen.getByText('Test Info')).toBeInTheDocument();
      expect(screen.getByText('This is a test message')).toBeInTheDocument();
    });

    // Should have the info icon
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('should dismiss toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );

    // Show a toast
    fireEvent.click(screen.getByTestId('show-info-toast'));

    // Wait for toast to appear
    await waitFor(() => {
      expect(screen.getByText('Test Info')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    // Toast should disappear
    await waitFor(() => {
      expect(screen.queryByText('Test Info')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should auto-dismiss toast after duration', async () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );

    // Show a toast with short duration
    fireEvent.click(screen.getByTestId('show-info-toast'));

    // Wait for toast to appear
    await waitFor(() => {
      expect(screen.getByText('Test Info')).toBeInTheDocument();
    });

    // Wait for auto-dismiss (duration is 1000ms)
    await waitFor(() => {
      expect(screen.queryByText('Test Info')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });
}); 