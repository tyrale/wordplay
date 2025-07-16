/**
 * MainScreen Component Tests
 * 
 * Tests the main screen component including bot filtering based on unlock state.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MainScreen } from '../MainScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { UnlockProvider } from '../../unlock/UnlockProvider';
import { ToastProvider } from '../ToastManager';

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
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'vs world';
    })).toBeInTheDocument();
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

    // Should show bot selection screen (no back button - uses menu navigation)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    
    // Should show at least the basicBot bot (always unlocked)
    expect(screen.getByText('basicBot')).toBeInTheDocument();
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
      expect(screen.getByText('basicBot')).toBeInTheDocument();
    });

    // In fresh user state, should only show basicBot bot
    expect(screen.getByText('basicBot')).toBeInTheDocument();
    
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

    // Wait for basicBot to appear and click it
    await waitFor(() => {
      expect(screen.getByText('basicBot')).toBeInTheDocument();
    });

    const basicBotButton = screen.getByText('basicBot');
    fireEvent.click(basicBotButton);

    // Should call onStartGame with correct parameters
    expect(mockOnStartGame).toHaveBeenCalledWith('bot', 'basicBot');
  });

  it('should show menu button for navigation in bot selection', async () => {
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
      expect(screen.getByText('basicBot')).toBeInTheDocument();
    });

    // Should show menu button for navigation (current app pattern)
    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton.textContent).toBe('≡');

    // Should show bot selection content
    expect(screen.getByText('basicBot')).toBeInTheDocument();
  });
}); 