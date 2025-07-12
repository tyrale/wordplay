import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TutorialOverlay } from '../TutorialOverlay';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AnimationProvider } from '../../../animations/AnimationProvider';
import { UnlockProvider } from '../../unlock/UnlockProvider';
import { ToastProvider } from '../../ui/ToastManager';

// Mock the InteractiveGame component
vi.mock('../../game/InteractiveGame', () => ({
  InteractiveGame: ({ config, onGameStateChange }: any) => {
    // Simulate game state changes for testing
    React.useEffect(() => {
      const mockGameState = {
        currentWord: config.initialWord,
        gameStatus: 'active',
        players: [{ id: 'human', score: 0 }],
        turnHistory: []
      };
      onGameStateChange?.(mockGameState);
    }, [config, onGameStateChange]);

    return (
      <div data-testid="interactive-game">
        <div data-testid="game-config">{JSON.stringify(config)}</div>
        <div data-testid="current-word">{config.initialWord}</div>
      </div>
    );
  }
}));

// Mock the TutorialInstructions component
vi.mock('../TutorialInstructions', () => ({
  TutorialInstructions: ({ text }: { text: string }) => (
    <div data-testid="tutorial-instructions">{text}</div>
  )
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <AnimationProvider>
        <ToastProvider>
          <UnlockProvider>
            {component}
          </UnlockProvider>
        </ToastProvider>
      </AnimationProvider>
    </ThemeProvider>
  );
};

describe('TutorialOverlay', () => {
  const mockOnComplete = vi.fn();
  const mockOnNavigateHome = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders tutorial overlay with Step 1 instructions', () => {
    renderWithProviders(
      <TutorialOverlay 
        onComplete={mockOnComplete}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    expect(screen.getByTestId('tutorial-instructions')).toHaveTextContent('add a letter');
    expect(screen.getByTestId('interactive-game')).toBeInTheDocument();
  });

  test('applies correct game configuration for Step 1', () => {
    renderWithProviders(
      <TutorialOverlay 
        onComplete={mockOnComplete}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const gameConfig = screen.getByTestId('game-config');
    const config = JSON.parse(gameConfig.textContent || '{}');
    
    expect(config.initialWord).toBe('WORD');
    expect(config.maxTurns).toBe(20);
    expect(config.botId).toBe('tester');
  });

  test('applies correct tutorial step CSS attribute', () => {
    renderWithProviders(
      <TutorialOverlay 
        onComplete={mockOnComplete}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    const gameElement = document.querySelector('[data-tutorial-step]');
    expect(gameElement).toHaveAttribute('data-tutorial-step', '1');
  });

  test('progresses from Step 1 to Step 2 when WORDS is reached', async () => {
    // Mock InteractiveGame to simulate step progression
    vi.doMock('../../game/InteractiveGame', () => ({
      InteractiveGame: ({ config, onGameStateChange }: any) => {
        React.useEffect(() => {
          // First render with WORD
          const initialState = {
            currentWord: config.initialWord,
            gameStatus: 'active',
            players: [{ id: 'human', score: 0 }],
            turnHistory: []
          };
          onGameStateChange?.(initialState);

          // Simulate progression to WORDS after a delay
          if (config.initialWord === 'WORD') {
            setTimeout(() => {
              const progressedState = {
                currentWord: 'WORDS',
                gameStatus: 'active',
                players: [{ id: 'human', score: 0 }],
                turnHistory: []
              };
              onGameStateChange?.(progressedState);
            }, 100);
          }
        }, [config, onGameStateChange]);

        return (
          <div data-testid="interactive-game">
            <div data-testid="game-config">{JSON.stringify(config)}</div>
            <div data-testid="current-word">{config.initialWord}</div>
          </div>
        );
      }
    }));

    renderWithProviders(
      <TutorialOverlay 
        onComplete={mockOnComplete}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    // Initially should show Step 1
    expect(screen.getByTestId('tutorial-instructions')).toHaveTextContent('add a letter');
    
    // Wait for progression to Step 2
    await waitFor(() => {
      expect(screen.getByTestId('tutorial-instructions')).toHaveTextContent('add a letter\nremove a letter');
    }, { timeout: 200 });

    // Should update tutorial step attribute
    await waitFor(() => {
      const gameElement = document.querySelector('[data-tutorial-step]');
      expect(gameElement).toHaveAttribute('data-tutorial-step', '2');
    });
  });

  test('completes tutorial when Step 2 condition is met', async () => {
    // Mock InteractiveGame to simulate full tutorial completion
    vi.doMock('../../game/InteractiveGame', () => ({
      InteractiveGame: ({ config, onGameStateChange }: any) => {
        React.useEffect(() => {
          const initialState = {
            currentWord: config.initialWord,
            gameStatus: 'active',
            players: [{ id: 'human', score: 0 }],
            turnHistory: []
          };
          onGameStateChange?.(initialState);

          // Simulate Step 2 completion (WORDS → WORS)
          if (config.initialWord === 'WORDS') {
            setTimeout(() => {
              const completedState = {
                currentWord: 'WORS',
                gameStatus: 'active',
                players: [{ id: 'human', score: 0 }],
                turnHistory: []
              };
              onGameStateChange?.(completedState);
            }, 100);
          }
        }, [config, onGameStateChange]);

        return (
          <div data-testid="interactive-game">
            <div data-testid="game-config">{JSON.stringify(config)}</div>
            <div data-testid="current-word">{config.initialWord}</div>
          </div>
        );
      }
    }));

    renderWithProviders(
      <TutorialOverlay 
        onComplete={mockOnComplete}
        onNavigateHome={mockOnNavigateHome}
      />
    );

    // Wait for tutorial completion
    await waitFor(() => {
      expect(screen.queryByTestId('tutorial-instructions')).not.toBeInTheDocument();
    }, { timeout: 200 });

    // Should apply complete CSS class
    await waitFor(() => {
      const gameElement = document.querySelector('.tutorial-overlay__game--complete');
      expect(gameElement).toBeInTheDocument();
    });
  });
}); 