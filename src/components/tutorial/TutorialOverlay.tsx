import React, { useState, useEffect, useRef } from 'react';
import type { GameState } from '../../../packages/engine/interfaces';
import { TUTORIAL_STEPS } from './tutorialSteps';
import type { TutorialState } from './tutorialSteps';
import './TutorialOverlay.css';

export interface TutorialOverlayProps {
  /** Live game state from the real InteractiveGame instance this overlay sits on top of */
  gameState: GameState | null;
  onSkip: () => void;
  onComplete: () => void;
  /** Called whenever the active step changes, so the parent can drive CSS restrictions + disableLetterRemoval */
  onStepChange?: (stepId: number) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  gameState,
  onSkip,
  onComplete,
  onStepChange
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    lastPendingWord: '',
    submittedWords: [],
    lastTurnHistoryLength: 0
  });
  const isAdvancingRef = useRef(false);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  // Notify parent of step changes (drives wrapper CSS class + disableLetterRemoval)
  useEffect(() => {
    onStepChange?.(currentStep.id);
  }, [currentStep.id, onStepChange]);

  // Track newly submitted words from the real game's turn history
  useEffect(() => {
    if (!gameState?.turnHistory) return;

    const historyLength = gameState.turnHistory.length;
    if (historyLength <= tutorialState.lastTurnHistoryLength) return;

    const newWords = gameState.turnHistory
      .slice(tutorialState.lastTurnHistoryLength)
      .filter((turn) => turn.playerId === 'human')
      .map((turn) => turn.newWord);

    if (newWords.length > 0) {
      setTutorialState((prev) => ({
        ...prev,
        submittedWords: [...prev.submittedWords, ...newWords],
        lastTurnHistoryLength: historyLength
      }));
    } else {
      setTutorialState((prev) => ({ ...prev, lastTurnHistoryLength: historyLength }));
    }
  }, [gameState, tutorialState.lastTurnHistoryLength]);

  // Poll the live DOM for the in-progress word (drives step completion checks below).
  // Polling (rather than mutation observers) keeps this resilient to re-renders in InteractiveGame.
  useEffect(() => {
    const poll = () => {
      const wordBuilderLetters = document.querySelectorAll('.word-builder__letter');
      if (wordBuilderLetters.length > 0) {
        const word = Array.from(wordBuilderLetters)
          .map((el) => el.textContent || '')
          .join('');
        setTutorialState((prev) => (word && word !== prev.lastPendingWord ? { ...prev, lastPendingWord: word } : prev));
      }
    };

    poll();
    const intervalId = setInterval(poll, 150);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Advance to the next step (or complete the tutorial) once the current step's condition is met
  useEffect(() => {
    if (isAdvancingRef.current) return;
    if (!currentStep.completionCondition(gameState, tutorialState)) return;

    isAdvancingRef.current = true;
    const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

    const timeoutId = setTimeout(() => {
      if (isLastStep) {
        onComplete();
      } else {
        setCurrentStepIndex((prev) => prev + 1);
        isAdvancingRef.current = false;
      }
    }, isLastStep ? 1200 : 500);

    return () => clearTimeout(timeoutId);
  }, [gameState, tutorialState, currentStep, currentStepIndex, onComplete]);

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-overlay__banner">
        <div className="tutorial-overlay__progress">
          {TUTORIAL_STEPS.map((step, index) => (
            <span
              key={step.id}
              className={`tutorial-overlay__dot ${index <= currentStepIndex ? 'tutorial-overlay__dot--active' : ''}`}
            />
          ))}
        </div>

        <div className="tutorial-overlay__lines">
          {currentStep.banner.map((line, index) => (
            <div key={index} className="tutorial-overlay__line">
              {line}
            </div>
          ))}
        </div>

        <button className="tutorial-overlay__skip" onClick={onSkip} type="button">
          Skip tutorial
        </button>
      </div>
    </div>
  );
};
