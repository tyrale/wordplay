/**
 * MainScreen Component Tests
 * 
 * Tests the main screen component including bot filtering based on unlock state.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { UnlockProvider } from '../../unlock/UnlockProvider';
import { ToastProvider } from '../ToastManager';
import { MainScreen } from '../MainScreen';

// Test wrapper with required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UnlockProvider>
          {children}
        </UnlockProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('MainScreen Component', () => {
  const mockOnStartGame = vi.fn();

  beforeEach(() => {
    mockOnStartGame.mockClear();
  });

  it('should render main game selection initially', async () => {
    render(
      <TestWrapper>
        <MainScreen onStartGame={mockOnStartGame} />
      </TestWrapper>
    );

    // Should show main game options
    expect(screen.getByText('challenge')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'vs human';
    })).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'vs bot';
    })).toBeInTheDocument();
  });

  it('should show bot selection when vs bot is clicked', async () => {
    render(
      <TestWrapper>
        <MainScreen onStartGame={mockOnStartGame} />
      </TestWrapper>
    );

    // Click vs bot button
    const vsBotButton = screen.getByText((content, element) => {
      return element?.textContent === 'vs bot';
    });
    fireEvent.click(vsBotButton);

    // Should show bot selection screen
    expect(screen.getByText('← back')).toBeInTheDocument();
    
    // Should show at least the tester bot (always unlocked)
    await waitFor(() => {
      expect(screen.getByText('tester')).toBeInTheDocument();
    });
  });

  it('should only show unlocked bots in fresh user state', async () => {
    render(
      <TestWrapper>
        <MainScreen onStartGame={mockOnStartGame} />
      </TestWrapper>
    );

    // Navigate to bot selection
    const vsBotButton = screen.getByText((content, element) => {
      return element?.textContent === 'vs bot';
    });
    fireEvent.click(vsBotButton);

    // Wait for unlock system to initialize
    await waitFor(() => {
      expect(screen.getByText('tester')).toBeInTheDocument();
    });

    // In fresh user state, should only show tester bot
    expect(screen.getByText('tester')).toBeInTheDocument();
    
    // Should not show locked bots like easy bot (until unlocked)
    expect(screen.queryByText('easy bot')).not.toBeInTheDocument();
    expect(screen.queryByText('medium bot')).not.toBeInTheDocument();
    expect(screen.queryByText('hard bot')).not.toBeInTheDocument();
  });

  it('should call onStartGame when bot is selected', async () => {
    render(
      <TestWrapper>
        <MainScreen onStartGame={mockOnStartGame} />
      </TestWrapper>
    );

    // Navigate to bot selection
    const vsBotButton = screen.getByText((content, element) => {
      return element?.textContent === 'vs bot';
    });
    fireEvent.click(vsBotButton);

    // Wait for tester bot to appear and click it
    await waitFor(() => {
      expect(screen.getByText('tester')).toBeInTheDocument();
    });

    const testerButton = screen.getByText('tester');
    fireEvent.click(testerButton);

    // Should call onStartGame with correct parameters
    expect(mockOnStartGame).toHaveBeenCalledWith('bot', 'tester');
  });

  it('should return to main screen when back button is clicked', async () => {
    render(
      <TestWrapper>
        <MainScreen onStartGame={mockOnStartGame} />
      </TestWrapper>
    );

    // Navigate to bot selection
    const vsBotButton = screen.getByText((content, element) => {
      return element?.textContent === 'vs bot';
    });
    fireEvent.click(vsBotButton);

    // Wait for bot selection screen
    await waitFor(() => {
      expect(screen.getByText('← back')).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByText('← back');
    fireEvent.click(backButton);

    // Should return to main screen
    expect(screen.getByText('challenge')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'vs bot';
    })).toBeInTheDocument();
  });
}); 