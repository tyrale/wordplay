import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TutorialInstructions } from '../TutorialInstructions';
import { TutorialOverlay } from '../TutorialOverlay';

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

  it('renders Step 3 four-line instructions', () => {
    render(<TutorialInstructions text={["add a letter", "remove a letter", "move to spell ROWS", "tap to submit"]} />);
    expect(screen.getByText('add a letter')).toBeInTheDocument();
    expect(screen.getByText('remove a letter')).toBeInTheDocument();
    expect(screen.getByText('move to spell ROWS')).toBeInTheDocument();
    expect(screen.getByText('tap to submit')).toBeInTheDocument();
  });

  it('renders Step 4 five-line instructions with empty line', () => {
    render(<TutorialInstructions text={["key letter +1", "& locked next turn", "", "15 turns each", "high score wins"]} />);
    expect(screen.getByText('key letter +1')).toBeInTheDocument();
    expect(screen.getByText('& locked next turn')).toBeInTheDocument();
    expect(screen.getByText('15 turns each')).toBeInTheDocument();
    expect(screen.getByText('high score wins')).toBeInTheDocument();
    
    // Check that there are 5 instruction lines (including empty one)
    const instructionLines = document.querySelectorAll('.tutorial-instructions__line');
    expect(instructionLines).toHaveLength(5);
  });

  it('renders Step 5 single-line thank you message', () => {
    render(<TutorialInstructions text={["thanks & have fun"]} />);
    expect(screen.getByText('thanks & have fun')).toBeInTheDocument();
    
    // Check that there is only 1 instruction line
    const instructionLines = document.querySelectorAll('.tutorial-instructions__line');
    expect(instructionLines).toHaveLength(1);
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

describe('TutorialOverlay', () => {
  it('renders tutorial overlay component', () => {
    render(
      <TutorialOverlay 
        onComplete={() => {}}
        onNavigateHome={() => {}}
      />
    );

    // Check that the tutorial overlay renders
    const overlay = document.querySelector('.tutorial-overlay');
    expect(overlay).toBeInTheDocument();
  });
}); 