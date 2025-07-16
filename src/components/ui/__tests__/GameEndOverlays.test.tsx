import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WinnerOverlay } from '../WinnerOverlay';
import { LoserOverlay } from '../LoserOverlay';

describe('WinnerOverlay', () => {
  it('renders winner text when visible', () => {
    const mockOnComplete = vi.fn();
    
    render(
      <WinnerOverlay
        isVisible={true}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('winner')).toBeInTheDocument();
    expect(screen.getByText('*cheer*')).toBeInTheDocument();
    expect(screen.getByText('*applause*')).toBeInTheDocument();
  });

  it('renders with final scores when provided', () => {
    const mockOnComplete = vi.fn();
    const finalScores = { human: 25, bot: 18 };
    
    render(
      <WinnerOverlay
        isVisible={true}
        onComplete={mockOnComplete}
        finalScores={finalScores}
        botName="Basic Bot"
      />
    );
    
    expect(screen.getByText('You: 25')).toBeInTheDocument();
    expect(screen.getByText('Basic Bot: 18')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const mockOnComplete = vi.fn();
    
    render(
      <WinnerOverlay
        isVisible={false}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.queryByText('winner')).not.toBeInTheDocument();
  });
});

describe('LoserOverlay', () => {
  it('renders loser text when visible', () => {
    const mockOnComplete = vi.fn();
    
    render(
      <LoserOverlay
        isVisible={true}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('loser')).toBeInTheDocument();
    expect(screen.getByText('*sigh*')).toBeInTheDocument();
    expect(screen.getByText('*groan*')).toBeInTheDocument();
  });

  it('renders with final scores when provided', () => {
    const mockOnComplete = vi.fn();
    const finalScores = { human: 15, bot: 28 };
    
    render(
      <LoserOverlay
        isVisible={true}
        onComplete={mockOnComplete}
        finalScores={finalScores}
        botName="Advanced Bot"
      />
    );
    
    expect(screen.getByText('You: 15')).toBeInTheDocument();
    expect(screen.getByText('Advanced Bot: 28')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const mockOnComplete = vi.fn();
    
    render(
      <LoserOverlay
        isVisible={false}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.queryByText('loser')).not.toBeInTheDocument();
  });
}); 