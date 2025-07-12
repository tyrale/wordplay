import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TutorialInstructions } from '../TutorialInstructions';
import { TutorialOverlay } from '../TutorialOverlay';

// Mock the InteractiveGame component
vi.mock('../../game/InteractiveGame', () => ({
  InteractiveGame: () => <div data-testid="interactive-game">Mocked Game</div>
}));

describe('Tutorial Components', () => {
  describe('TutorialInstructions', () => {
    it('should render tutorial instructions text', () => {
      render(<TutorialInstructions text="add a letter" />);
      
      expect(screen.getByText('add a letter')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TutorialInstructions text="test" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('tutorial-instructions', 'custom-class');
    });
  });

  describe('TutorialOverlay', () => {
    it('should render tutorial overlay with instructions', () => {
      const mockOnComplete = vi.fn();
      const mockOnNavigateHome = vi.fn();

      render(
        <TutorialOverlay 
          onComplete={mockOnComplete}
          onNavigateHome={mockOnNavigateHome}
        />
      );

      // Check that tutorial instructions are shown
      expect(screen.getByText('add a letter')).toBeInTheDocument();
      
      // Check that the game component is rendered
      expect(screen.getByTestId('interactive-game')).toBeInTheDocument();
    });

    it('should have proper CSS classes for step 1', () => {
      const mockOnComplete = vi.fn();
      const mockOnNavigateHome = vi.fn();

      const { container } = render(
        <TutorialOverlay 
          onComplete={mockOnComplete}
          onNavigateHome={mockOnNavigateHome}
        />
      );

      const gameContainer = container.querySelector('.tutorial-overlay__game');
      expect(gameContainer).toHaveClass('tutorial-overlay--step-1');
    });
  });
}); 