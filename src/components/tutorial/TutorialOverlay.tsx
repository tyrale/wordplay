import React, { useState, useEffect, useCallback } from 'react';
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
  forcedGameConfig: any;
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
        disabledActions: ['remove-letter', 'move-letter'],
        forcedGameConfig: { 
          initialWord: 'WORD',
          maxTurns: 20,
          allowBotPlayer: true,
          enableKeyLetters: true,
          enableLockedLetters: true,
          botId: 'tester'
        },
      letterOpacity: { default: 0.3, S: 1.0 },
      allowedLetters: ['S']
    },
    completionCondition: (gameState, pendingWord) => {
      return pendingWord === 'WORDS' || gameState.currentWord === 'WORDS';
    }
  },
  {
    id: 2,
    instructions: ["add a letter", "remove a letter"],
    constraints: {
      hiddenElements: ['action-icons', 'key-letters'],
      disabledActions: ['move-letter'],
      forcedGameConfig: { 
        initialWord: 'WORDS',
        maxTurns: 20,
        allowBotPlayer: true,
        enableKeyLetters: true,
        enableLockedLetters: true,
        botId: 'tester'
      },
      letterOpacity: {},
      allowedLetters: []
    },
    completionCondition: (gameState, pendingWord) => {
      return pendingWord === 'WORS' || gameState.currentWord === 'WORS';
    }
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onComplete,
  onNavigateHome
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [gameState, setGameState] = useState<any>(null);
  const [pendingWord] = useState<string>('');
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

  // Monitor for step 1 completion by checking if current word is WORDS
  useEffect(() => {
    if (currentStep === 1 && gameState?.currentWord === 'WORDS') {
      // Step 1 completed - user successfully added S to WORD
      setCurrentStep(2); // Move to step 2
    }
  }, [currentStep, gameState?.currentWord]);

  // Monitor for step 2 completion by checking if current word is WORS
  useEffect(() => {
    if (currentStep === 2 && pendingWord === 'WORS') {
      // Step 2 completed - user successfully removed D from WORDS
      setCurrentStep(3); // Move to step 3 (not implemented yet)
    }
  }, [currentStep, pendingWord]);

  const handleGameStateChange = useCallback((newGameState: any) => {
    setGameState(newGameState);
  }, []);

  const handleGameEnd = useCallback(() => {
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
        className={`tutorial-overlay__game ${
          tutorialComplete 
            ? 'tutorial-overlay--complete' 
            : `tutorial-overlay--step-${currentStep}`
        }`}
      >
        <InteractiveGame
          config={currentTutorialStep.constraints.forcedGameConfig}
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