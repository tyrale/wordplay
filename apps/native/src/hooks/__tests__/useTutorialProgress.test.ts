import { renderHook, waitFor } from '@testing-library/react-native';
import { useTutorialProgress } from '../useTutorialProgress';
import { TUTORIAL_STEPS } from '../tutorialSteps';
import type { GameState } from '@wordplay/engine/interfaces';

interface HookProps {
  pendingWord: string;
  gameState: GameState;
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameStatus: 'playing',
    currentWord: 'WORD',
    keyLetters: [],
    lockedLetters: [],
    lockedKeyLetters: [],
    players: [],
    currentPlayerIndex: 0,
    currentTurn: 1,
    maxTurns: 20,
    usedKeyLetters: [],
    turnHistory: [],
    usedWords: [],
    gameStartTime: null,
    lastMoveTime: null,
    winner: null,
    totalMoves: 0,
    config: {},
    ...overrides
  } as GameState;
}

describe('native useTutorialProgress', () => {
  it('starts at step 1', () => {
    const { result } = renderHook(() => useTutorialProgress('WORD', makeGameState()));
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.currentStep.id).toBe(1);
    expect(result.current.isComplete).toBe(false);
  });

  it('advances to step 2 once the pending word is WORDS', async () => {
    const { result, rerender } = renderHook(
      (props: HookProps) => useTutorialProgress(props.pendingWord, props.gameState),
      { initialProps: { pendingWord: 'WORD', gameState: makeGameState() } }
    );

    rerender({ pendingWord: 'WORDS', gameState: makeGameState() });

    await waitFor(() => expect(result.current.currentStepIndex).toBe(1), { timeout: 2000 });
    expect(result.current.currentStep.id).toBe(2);
  });

  it('advances to step 3 once the pending word is WORS', async () => {
    const { result, rerender } = renderHook(
      (props: HookProps) => useTutorialProgress(props.pendingWord, props.gameState),
      { initialProps: { pendingWord: 'WORDS', gameState: makeGameState() } }
    );
    await waitFor(() => expect(result.current.currentStepIndex).toBe(1), { timeout: 2000 });

    rerender({ pendingWord: 'WORS', gameState: makeGameState() });
    await waitFor(() => expect(result.current.currentStepIndex).toBe(2), { timeout: 2000 });
    expect(result.current.currentStep.id).toBe(3);
  });

  it('advances to step 4 once "ROWS" has been submitted (via turnHistory), regardless of tap vs. drag', async () => {
    const gameStateWithRows = makeGameState({
      turnHistory: [
        { turnNumber: 1, playerId: 'human', previousWord: 'WORS', newWord: 'ROWS', score: 5, keyLettersUsed: [], scoringBreakdown: {} as never, timestamp: Date.now() }
      ]
    });

    const { result, rerender } = renderHook(
      (props: HookProps) => useTutorialProgress(props.pendingWord, props.gameState),
      { initialProps: { pendingWord: 'WORS', gameState: makeGameState() } }
    );
    // Manually walk to step 3 first.
    rerender({ pendingWord: 'WORDS', gameState: makeGameState() });
    await waitFor(() => expect(result.current.currentStepIndex).toBe(1));
    rerender({ pendingWord: 'WORS', gameState: makeGameState() });
    await waitFor(() => expect(result.current.currentStepIndex).toBe(2));

    rerender({ pendingWord: 'ROWS', gameState: gameStateWithRows });
    await waitFor(() => expect(result.current.currentStepIndex).toBe(3), { timeout: 2000 });
    expect(result.current.currentStep.id).toBe(4);
  });

  it('completes after one more word is played beyond the final step baseline', async () => {
    // Directly exercise the last step's completion condition in isolation
    // (a full walk-through would be slow/flaky here) - this is the same
    // completionCondition function the hook calls internally.
    const finalStep = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(
      finalStep.completionCondition('', null, { submittedWords: ['ROWS', 'ROW'], lastTurnHistoryLength: 2, finalStepWordBaseline: 2 })
    ).toBe(false);
    expect(
      finalStep.completionCondition('', null, { submittedWords: ['ROWS', 'ROW', 'CROW'], lastTurnHistoryLength: 3, finalStepWordBaseline: 2 })
    ).toBe(true);
  });
});
