import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InteractiveGame } from '../game/InteractiveGame';
import { TutorialInstructions } from './TutorialInstructions';
import './TutorialOverlay.css';

interface TutorialStep {
  id: number;
  instructions: string | string[];
  constraints: TutorialConstraints;
  completionCondition: (gameState: any, pendingWord: string) => boolean;
}

interface TutorialConstraints {
  hiddenElements: string[];
  disabledActions: string[];
  letterOpacity: Record<string, number>;
  allowedLetters?: string[];
}

interface TutorialOverlayProps {
  onComplete: () => void;
  onNavigateHome: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    instructions: "add a letter",
    constraints: {
      hiddenElements: ['action-icons', 'key-letters'],
      disabledActions: ['remove-letter', 'move-letter', 'score-click'],
      letterOpacity: { default: 0.3, S: 1.0 },
      allowedLetters: ['S']
    },
    completionCondition: (gameState, pendingWord) => {
      // Step 1 completes when user clicks S from alphabet
      return gameState?.lastAction === 'letter-added' && gameState?.lastLetter === 'S';
    }
  },
  {
    id: 2,
    instructions: ["add a letter", "remove a letter"],
    constraints: {
      hiddenElements: ['action-icons', 'key-letters'],
      disabledActions: ['alphabet-click', 'score-click'],
      letterOpacity: { default: 1.0 },
      allowedLetters: []
    },
    completionCondition: (gameState, pendingWord) => {
      // Step 2 completes when user clicks D from word builder (removal)
      return gameState?.lastAction === 'letter-removed' && gameState?.lastLetter === 'D';
    }
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onComplete,
  onNavigateHome
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [gameState, setGameState] = useState<any>(null);
  const [pendingWord, setPendingWord] = useState<string>('');
  const [tutorialComplete, setTutorialComplete] = useState<boolean>(false);

  const currentTutorialStep = TUTORIAL_STEPS.find(step => step.id === currentStep);

  // Monitor game state changes to check for step completion
  useEffect(() => {
    if (currentTutorialStep && gameState) {
      const isStepComplete = currentTutorialStep.completionCondition(gameState, pendingWord);
      
      if (isStepComplete && !tutorialComplete) {
        if (currentStep < TUTORIAL_STEPS.length) {
          // Move to next step
          setCurrentStep(currentStep + 1);
        } else {
          // Tutorial complete - remove all constraints
          setTutorialComplete(true);
        }
      }
    }
  }, [gameState, pendingWord, currentStep, currentTutorialStep, tutorialComplete]);

  const handleGameStateChange = useCallback((newGameState: any) => {
    setGameState(newGameState);
  }, []);

  const handleGameEnd = useCallback((winner: string | null, finalScores: { human: number; bot: number }) => {
    // Tutorial completed naturally through game end
    onComplete();
  }, [onComplete]);

  const handleResign = useCallback(() => {
    // Allow resignation from tutorial
    onComplete();
  }, [onComplete]);

  if (!currentTutorialStep) {
    return null;
  }

  return (
    <div className="tutorial-overlay">
      {/* Tutorial Instructions */}
      {!tutorialComplete && (
        <TutorialInstructions 
          text={currentTutorialStep.instructions}
        />
      )}
      
      {/* Game with Tutorial Constraints */}
      <div 
        className={`tutorial-overlay__game ${tutorialComplete ? 'tutorial-overlay__game--complete' : ''}`}
        data-tutorial-step={tutorialComplete ? 'complete' : currentStep}
      >
        <InteractiveGame
          onGameEnd={handleGameEnd}
          onResign={handleResign}
          onNavigateHome={onNavigateHome}
          currentGameMode="tutorial"
          onStartGame={() => {}} // Disable game switching during tutorial
          onGameStateChange={handleGameStateChange}
        />
      </div>
    </div>
  );
}; 