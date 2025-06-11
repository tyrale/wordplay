/// <reference types="vitest/globals" />
import { describe, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
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
  return <App />;
}

describe('App Component', () => {
  beforeEach(() => {
    // Initialize test adapter for each test
    createTestAdapter();
  });

  test('renders the initial main screen', async () => {
    render(<TestApp />);
    
    // Check that the main screen is rendered with game options
    expect(screen.getByText('challenge')).toBeInTheDocument();
    expect(screen.getByText('vs human')).toBeInTheDocument();
    expect(screen.getByText('vs bot')).toBeInTheDocument();
    
    // Check for menu button
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  test('renders the game selection buttons', async () => {
    render(<TestApp />);
    
    // Check for game selection buttons
    const botButton = screen.getByText('vs bot');
    expect(botButton).toBeInTheDocument();
    expect(botButton.tagName).toBe('BUTTON');
    
    const challengeButton = screen.getByText('challenge');
    expect(challengeButton).toBeInTheDocument();
    expect(challengeButton.tagName).toBe('BUTTON');
    
    const humanButton = screen.getByText('vs human');
    expect(humanButton).toBeInTheDocument();
    expect(humanButton.tagName).toBe('BUTTON');
  });

  test('shows the main screen structure', async () => {
    render(<TestApp />);
    
    // Check for main screen elements
    expect(screen.getByText('challenge')).toBeInTheDocument();
    expect(screen.getByText('vs human')).toBeInTheDocument();
    expect(screen.getByText('vs bot')).toBeInTheDocument();
    
    // Check that the main screen component is rendered
    const mainContainer = document.querySelector('.main-screen');
    expect(mainContainer).toBeInTheDocument();
  });

  test('has proper CSS classes applied', async () => {
    render(<TestApp />);
    
    // Check for main screen container
    const mainContainer = document.querySelector('.main-screen');
    expect(mainContainer).toBeInTheDocument();
    
    // Check for content structure
    const content = document.querySelector('.main-screen__content');
    expect(content).toBeInTheDocument();
    
    // Check for game selection section
    const gameSelection = document.querySelector('.main-screen__game-selection');
    expect(gameSelection).toBeInTheDocument();
  });

  test('renders menu button', async () => {
    render(<TestApp />);
    
    // Check for menu button with correct icon (matches alphabet grid)
    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton).toBeInTheDocument();
    expect(menuButton.textContent).toBe('≡');
  });
});
