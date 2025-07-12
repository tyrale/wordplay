import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TutorialInstructions } from '../TutorialInstructions';

// Mock the InteractiveGame component
vi.mock('../../game/InteractiveGame', () => ({
  InteractiveGame: () => <div data-testid="interactive-game">Mock Interactive Game</div>
}));

describe('TutorialInstructions', () => {
  it('renders single line instruction', () => {
    render(<TutorialInstructions text="add a letter" />);
    expect(screen.getByText('add a letter')).toBeInTheDocument();
  });

  it('renders multiple line instructions', () => {
    render(<TutorialInstructions text={["add a letter", "remove a letter"]} />);
    expect(screen.getByText('add a letter')).toBeInTheDocument();
    expect(screen.getByText('remove a letter')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TutorialInstructions text="test" className="custom-class" />);
    const element = screen.getByText('test').closest('.tutorial-instructions');
    expect(element).toHaveClass('custom-class');
  });

  it('renders each instruction line with proper class', () => {
    render(<TutorialInstructions text={["first line", "second line"]} />);
    
    const lines = screen.getAllByText(/line/);
    expect(lines).toHaveLength(2);
    
    lines.forEach(line => {
      expect(line.closest('.tutorial-instructions__line')).toBeInTheDocument();
    });
  });
}); 