/**
 * Alert Provider Tests
 *
 * Tests the imperative alert queueing system (replaces the legacy Toast system).
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertProvider, useAlert } from '../AlertProvider';

// Test component that uses the alert system
function TestAlertComponent() {
  const { showAlert, showCustomAlert } = useAlert();

  return (
    <div>
      <button
        data-testid="show-unlock-alert"
        onClick={() => showAlert('unlocks', 'theme', { params: { item: 'RED' } })}
      >
        Show Unlock Alert
      </button>
      <button
        data-testid="show-custom-alert"
        onClick={() => showCustomAlert(['CUSTOM', 'ALERT'])}
      >
        Show Custom Alert
      </button>
    </div>
  );
}

describe('Alert System', () => {
  it('should show unlock alert with substituted item name', async () => {
    render(
      <AlertProvider>
        <TestAlertComponent />
      </AlertProvider>
    );

    fireEvent.click(screen.getByTestId('show-unlock-alert'));

    await waitFor(() => {
      expect(screen.getByText('NEW')).toBeInTheDocument();
      expect(screen.getByText('THEME')).toBeInTheDocument();
      expect(screen.getByText('RED')).toBeInTheDocument();
    });
  });

  it('should show a custom alert', async () => {
    render(
      <AlertProvider>
        <TestAlertComponent />
      </AlertProvider>
    );

    fireEvent.click(screen.getByTestId('show-custom-alert'));

    await waitFor(() => {
      expect(screen.getByText('CUSTOM')).toBeInTheDocument();
      expect(screen.getByText('ALERT')).toBeInTheDocument();
    });
  });

  it('should dismiss the alert when the close button is clicked', async () => {
    render(
      <AlertProvider>
        <TestAlertComponent />
      </AlertProvider>
    );

    fireEvent.click(screen.getByTestId('show-custom-alert'));

    await waitFor(() => {
      expect(screen.getByText('CUSTOM')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('CUSTOM')).not.toBeInTheDocument();
    });
  });

  it('should queue multiple alerts and show them one at a time', async () => {
    render(
      <AlertProvider>
        <TestAlertComponent />
      </AlertProvider>
    );

    fireEvent.click(screen.getByTestId('show-unlock-alert'));
    fireEvent.click(screen.getByTestId('show-custom-alert'));

    // First alert (unlock) should show first
    await waitFor(() => {
      expect(screen.getByText('RED')).toBeInTheDocument();
    });
    expect(screen.queryByText('CUSTOM')).not.toBeInTheDocument();

    // Dismiss first, second should appear
    fireEvent.click(screen.getByLabelText('Close'));

    await waitFor(() => {
      expect(screen.getByText('CUSTOM')).toBeInTheDocument();
    });
  });
});
