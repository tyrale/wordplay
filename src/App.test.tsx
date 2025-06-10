/// <reference types="vitest/globals" />
import { describe, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from './components';
import { AnimationProvider } from './animations';
import { InteractiveGame } from './components';
import { createTestAdapter } from './adapters/testAdapter';
import { BrowserAdapter } from './adapters/browserAdapter';

// Mock the BrowserAdapter to use TestAdapter instead
vi.mock('./adapters/browserAdapter', () => {
  return {
    BrowserAdapter: {
      getInstance: () => {
        const testAdapter = createTestAdapter();
        return {
          initialize: async () => {
            // Mock successful initialization
          },
          getGameDependencies: () => testAdapter.getGameDependencies(),
          getDictionaryDependencies: () => testAdapter.getDictionaryDependencies(),
          isInitialized: true
        };
      }
    }
  };
});

// Test wrapper component that provides necessary context
function TestApp() {
  const handleGameEnd = (winner: string | null, finalScores: { human: number; bot: number }) => {
    // Game ended - could show end screen or stats here
  };

  return (
    <ThemeProvider>
      <AnimationProvider initialTheme="default">
        <InteractiveGame 
          config={{ 
            maxTurns: 10,
            allowBotPlayer: true,
            enableKeyLetters: true,
            enableLockedLetters: true
          }}
          onGameEnd={handleGameEnd}
        />
      </AnimationProvider>
    </ThemeProvider>
  );
}

describe('App Component', () => {
  beforeEach(() => {
    // Initialize test adapter for each test
    createTestAdapter();
  });

  test('renders the initial game screen', async () => {
    render(<TestApp />);
    
    // Check that the basic game structure is rendered
    expect(screen.getByText('Welcome to WordPlay')).toBeInTheDocument();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
    
    // Check for debug button
    expect(screen.getByLabelText('Open debug information')).toBeInTheDocument();
  });

  test('renders the start game button', async () => {
    render(<TestApp />);
    
    // Check for start game button
    const startButton = screen.getByText('Start Game');
    expect(startButton).toBeInTheDocument();
    expect(startButton.tagName).toBe('BUTTON');
  });

  test('shows the game header structure', async () => {
    render(<TestApp />);
    
    // Check for game header elements
    expect(screen.getByText('Welcome to WordPlay')).toBeInTheDocument();
    
    // Check that the interactive game component is rendered
    const gameContainer = document.querySelector('.interactive-game');
    expect(gameContainer).toBeInTheDocument();
  });

  test('has proper CSS classes applied', async () => {
    render(<TestApp />);
    
    // Check for main game container
    const gameContainer = document.querySelector('.interactive-game');
    expect(gameContainer).toBeInTheDocument();
    
    // Check for header structure
    const header = document.querySelector('.interactive-game__header');
    expect(header).toBeInTheDocument();
    
    // Check for status section
    const status = document.querySelector('.interactive-game__status');
    expect(status).toBeInTheDocument();
  });

  test('renders debug button', async () => {
    render(<TestApp />);
    
    // Check for debug button
    const debugButton = screen.getByLabelText('Open debug information');
    expect(debugButton).toBeInTheDocument();
    expect(debugButton.textContent).toBe('🐛');
  });
});
