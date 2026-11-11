/**
 * Native tutorial progress tracking - ports the state-tracking logic from
 * apps/web's `components/tutorial/TutorialOverlay.tsx` into a standalone
 * hook, rather than a DOM-polling component. Web polls
 * `document.querySelectorAll('.word-builder__letter')` every 150ms to
 * read the in-progress word, since TutorialOverlay there doesn't
 * otherwise have access to InteractiveGame's internal `pendingWord`
 * state - there's no DOM here, and this port's InteractiveGame.tsx
 * already has `pendingWord` in scope, so it's passed in directly. This
 * is a strictly better implementation for this platform, not a
 * workaround.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@wordplay/engine/interfaces';
import { TUTORIAL_STEPS } from './tutorialSteps';
import type { TutorialState } from './tutorialSteps';

export interface UseTutorialProgressReturn {
  currentStepIndex: number;
  currentStep: (typeof TUTORIAL_STEPS)[number];
  isComplete: boolean;
}

export function useTutorialProgress(pendingWord: string, gameState: GameState | null): UseTutorialProgressReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    submittedWords: [],
    lastTurnHistoryLength: 0,
    finalStepWordBaseline: undefined
  });
  const isAdvancingRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  // Track newly submitted words from the real game's turn history.
  useEffect(() => {
    if (!gameState?.turnHistory) return;

    const historyLength = gameState.turnHistory.length;
    if (historyLength <= tutorialState.lastTurnHistoryLength) return;

    const newWords = gameState.turnHistory
      .slice(tutorialState.lastTurnHistoryLength)
      .filter(turn => turn.playerId === 'human')
      .map(turn => turn.newWord);

    if (newWords.length > 0) {
      setTutorialState(prev => ({
        ...prev,
        submittedWords: [...prev.submittedWords, ...newWords],
        lastTurnHistoryLength: historyLength
      }));
    } else {
      setTutorialState(prev => ({ ...prev, lastTurnHistoryLength: historyLength }));
    }
  }, [gameState, tutorialState.lastTurnHistoryLength]);

  // Advance to the next step (or complete the tutorial) once the current
  // step's condition is met.
  //
  // The scheduled timeout is tracked in `advanceTimeoutRef` rather than
  // returned as this effect's cleanup function. Returning it as a cleanup
  // would mean any dependency change while the timeout is pending (e.g. the
  // bot playing its move within the 500ms delay, which changes `gameState`)
  // cancels it - and since `isAdvancingRef.current` is already true at that
  // point, the re-run bails out at the guard above without rescheduling,
  // leaving the step stuck forever. Only actually clearing the timeout on
  // unmount avoids that race.
  useEffect(() => {
    if (isComplete) return;
    if (isAdvancingRef.current) return;
    if (!currentStep.completionCondition(pendingWord, gameState, tutorialState)) return;

    isAdvancingRef.current = true;
    const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      if (isLastStep) {
        setIsComplete(true);
      } else {
        const nextIndex = currentStepIndex + 1;
        const enteringFinalStep = nextIndex === TUTORIAL_STEPS.length - 1;
        setCurrentStepIndex(nextIndex);
        if (enteringFinalStep) {
          setTutorialState(prev => ({ ...prev, finalStepWordBaseline: prev.submittedWords.length }));
        }
        isAdvancingRef.current = false;
      }
    }, isLastStep ? 1200 : 500);
  }, [pendingWord, gameState, tutorialState, currentStep, currentStepIndex, isComplete]);

  // Clear any pending advance timeout on unmount only.
  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  return { currentStepIndex, currentStep, isComplete };
}
