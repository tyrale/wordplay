import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TutorialOverlay } from '../TutorialOverlay';
import { TUTORIAL_STEPS } from '../tutorialSteps';
import type { GameState } from '../../../../packages/engine/interfaces';

const baseGameState: GameState = {
  currentWord: 'WORD',
  keyLetters: [],
  lockedLetters: [],
  lockedKeyLetters: [],
  players: [
    { id: 'human', name: 'You', score: 0 },
    { id: 'bot', name: 'Bot', score: 0 }
  ],
  turnHistory: [],
  currentPlayerIndex: 0,
  gameStatus: 'playing',
  turnNumber: 1,
  usedWords: ['WORD'],
  lastMoveTime: null,
  winner: null,
  totalMoves: 0,
  config: {}
} as unknown as GameState;

describe('tutorialSteps', () => {
  it('defines 5 steps with banner copy and completion conditions', () => {
    expect(TUTORIAL_STEPS).toHaveLength(5);
    TUTORIAL_STEPS.forEach((step) => {
      expect(step.banner.length).toBeGreaterThan(0);
      expect(typeof step.completionCondition).toBe('function');
    });
  });

  it('step 3 disables letter removal (drag-only rearrange step)', () => {
    const step3 = TUTORIAL_STEPS.find((s) => s.id === 3);
    expect(step3?.disableLetterRemoval).toBe(true);
  });
});

describe('TutorialOverlay', () => {
  it('renders the first step banner and a skip control', () => {
    render(
      <TutorialOverlay
        gameState={baseGameState}
        onSkip={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText(TUTORIAL_STEPS[0].banner[0])).toBeInTheDocument();
    expect(screen.getByText('Skip tutorial')).toBeInTheDocument();
  });

  it('calls onSkip when the skip control is clicked', () => {
    const onSkip = vi.fn();
    render(
      <TutorialOverlay
        gameState={baseGameState}
        onSkip={onSkip}
        onComplete={vi.fn()}
      />
    );

    screen.getByText('Skip tutorial').click();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('notifies the parent of the initial step id via onStepChange', () => {
    const onStepChange = vi.fn();
    render(
      <TutorialOverlay
        gameState={baseGameState}
        onSkip={vi.fn()}
        onComplete={vi.fn()}
        onStepChange={onStepChange}
      />
    );

    expect(onStepChange).toHaveBeenCalledWith(TUTORIAL_STEPS[0].id);
  });
});