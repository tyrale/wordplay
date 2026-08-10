/// <reference types="vitest/globals" />
import { describe, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { createTestAdapter } from './adapters/testAdapter';

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

// The app now opens on a "start" title screen (tap to dismiss) before the
// main menu appears - render, then dismiss it via its close button so tests
// asserting on the main screen see it.
function renderAppPastStartScreen() {
  render(<TestApp />);
  fireEvent.click(screen.getByLabelText('Close'));
}

describe('App Component', () => {
  beforeEach(() => {
    // Initialize test adapter for each test
    createTestAdapter();
  });

  test('renders the initial main screen', async () => {
    renderAppPastStartScreen();
    
    // Check that the main screen is rendered with game options
    expect(screen.getByText((_content, element) => {
      return element?.textContent === 'vs world';
    })).toBeInTheDocument();
    expect(screen.getByText((_content, element) => {
      return element?.textContent === 'vshuman';
    })).toBeInTheDocument();
    expect(screen.getByText((_content, element) => {
      return element?.textContent === 'vs bot';
    })).toBeInTheDocument();
    
    // Check for menu button
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  test('renders the game selection buttons', async () => {
    renderAppPastStartScreen();
    
    // Check for game selection buttons
    const botButton = screen.getByText((_content, element) => {
      return element?.textContent === 'vs bot';
    });
    expect(botButton).toBeInTheDocument();
    expect(botButton.tagName).toBe('BUTTON');
    
    const worldButton = screen.getByText((_content, element) => {
      return element?.textContent === 'vs world';
    });
    expect(worldButton).toBeInTheDocument();
    expect(worldButton.tagName).toBe('BUTTON');
    
    const humanButton = screen.getByText((_content, element) => {
      return element?.textContent === 'vshuman';
    });
    expect(humanButton).toBeInTheDocument();
    expect(humanButton.tagName).toBe('BUTTON');
  });

  test('shows the main screen structure', async () => {
    renderAppPastStartScreen();
    
    // Check for main screen elements
    expect(screen.getByText((_content, element) => {
      return element?.textContent === 'vs world';
    })).toBeInTheDocument();
    expect(screen.getByText((_content, element) => {
      return element?.textContent === 'vshuman';
    })).toBeInTheDocument();
    expect(screen.getByText((_content, element) => {
      return element?.textContent === 'vs bot';
    })).toBeInTheDocument();
    
    // Check that the main screen component is rendered
    const mainContainer = document.querySelector('.main-screen');
    expect(mainContainer).toBeInTheDocument();
  });

  test('has proper CSS classes applied', async () => {
    renderAppPastStartScreen();
    
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
    renderAppPastStartScreen();
    
    // Check for menu button with correct icon (matches alphabet grid)
    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton).toBeInTheDocument();
    expect(menuButton.textContent).toBe('≡');
  });
});
