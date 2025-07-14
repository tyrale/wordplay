import React, { useState, useEffect, useCallback } from 'react';
import { InteractiveGame } from '../game/InteractiveGame';
import { TutorialInstructions } from './TutorialInstructions';
import './TutorialOverlay.css';

interface TutorialStep {
  id: number;
  instructions: string | string[];
  constraints: TutorialConstraints;
  completionCondition: (gameState: any, tutorialState: TutorialState) => boolean;
}

interface TutorialConstraints {
  hiddenElements: string[];
  disabledActions: string[];
  forcedGameConfig: any;
  letterOpacity: Record<string, number>;
  allowedLetters?: string[];
}

interface TutorialState {
  lastPendingWord: string;
  wordHistory: string[];
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
    completionCondition: (gameState, tutorialState: TutorialState) => {
      // Step 1 completes when user has "WORDS" in their pending word
      return tutorialState.lastPendingWord === 'WORDS' || 
             gameState.currentWord === 'WORDS';
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
    completionCondition: (gameState, tutorialState: TutorialState) => {
      // Step 2 completes when user has "WORS" in their pending word (removed D)
      return tutorialState.lastPendingWord === 'WORS' || 
             gameState.currentWord === 'WORS';
    }
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onComplete,
  onNavigateHome
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [gameState, setGameState] = useState<any>(null);
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    lastPendingWord: '',
    wordHistory: []
  });
  const [tutorialComplete, setTutorialComplete] = useState<boolean>(false);

  const currentTutorialStep = TUTORIAL_STEPS.find(step => step.id === currentStep);

  // Enhanced game state change handler that tracks pending word
  const handleGameStateChange = useCallback((newGameState: any) => {
    setGameState(newGameState);
    
    // Track the pending word by monitoring the word builder
    // We'll use a DOM observation approach to detect changes
    const wordBuilderElement = document.querySelector('.word-builder');
    if (wordBuilderElement) {
      const letters = wordBuilderElement.querySelectorAll('.word-builder__letter');
      const currentPendingWord = Array.from(letters).map(letter => letter.textContent).join('');
      
      if (currentPendingWord && currentPendingWord !== tutorialState.lastPendingWord) {
        setTutorialState((prev: TutorialState) => ({
          ...prev,
          lastPendingWord: currentPendingWord,
          wordHistory: [...prev.wordHistory, currentPendingWord]
        }));
      }
    }
  }, [tutorialState.lastPendingWord]);

  // Monitor for step completion
  useEffect(() => {
    if (currentTutorialStep && gameState && tutorialState.lastPendingWord) {
      const isStepComplete = currentTutorialStep.completionCondition(gameState, tutorialState);
      
      if (isStepComplete && !tutorialComplete) {
        console.log(`[Tutorial] Step ${currentStep} completed! Pending word: ${tutorialState.lastPendingWord}`);
        
        if (currentStep < TUTORIAL_STEPS.length) {
          // Move to next step
          setTimeout(() => {
            setCurrentStep(currentStep + 1);
            console.log(`[Tutorial] Moving to step ${currentStep + 1}`);
          }, 500); // Small delay to ensure the user sees the completion
        } else {
          // Tutorial complete - remove all constraints
          setTutorialComplete(true);
        }
      }
    }
  }, [gameState, tutorialState, currentStep, currentTutorialStep, tutorialComplete]);

  // Additional DOM monitoring for more reliable tracking
  useEffect(() => {
    const checkPendingWord = () => {
      const wordBuilderElement = document.querySelector('.word-builder');
      if (wordBuilderElement) {
        const letters = wordBuilderElement.querySelectorAll('.word-builder__letter');
        const currentPendingWord = Array.from(letters).map(letter => letter.textContent).join('');
        
        if (currentPendingWord && currentPendingWord !== tutorialState.lastPendingWord) {
          console.log(`[Tutorial] Detected pending word change: ${tutorialState.lastPendingWord} -> ${currentPendingWord}`);
          setTutorialState((prev: TutorialState) => ({
            ...prev,
            lastPendingWord: currentPendingWord,
            wordHistory: [...prev.wordHistory, currentPendingWord]
          }));
        }
      }
    };

    // Check immediately and then set up periodic checking
    checkPendingWord();
    const interval = setInterval(checkPendingWord, 200);

    return () => clearInterval(interval);
  }, [tutorialState.lastPendingWord]);

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