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
  disableLetterRemoval?: boolean;
}

interface TutorialState {
  lastPendingWord: string;
  submittedWords: string[];
  lastTurnHistoryLength: number;
}

interface TutorialOverlayProps {
  onComplete: () => void;
  onNavigateHome: () => void;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
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
        botId: 'basicBot'
      },
      letterOpacity: { default: 0.3, S: 1.0 },
      allowedLetters: ['S']
    },
    completionCondition: (gameState, tutorialState: TutorialState) => {
      // Step 1 completes when user has "WORDS" in their pending word
      return tutorialState.lastPendingWord === 'WORDS' || 
             (gameState && gameState.currentWord === 'WORDS');
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
        botId: 'basicBot'
      },
      letterOpacity: {},
      allowedLetters: []
    },
    completionCondition: (gameState, tutorialState: TutorialState) => {
      // Step 2 completes when user has "WORS" in their pending word (removed D)
      return tutorialState.lastPendingWord === 'WORS' || 
             (gameState && gameState.currentWord === 'WORS');
    }
  },
  {
    id: 3,
    instructions: ["add a letter", "remove a letter", "move to spell ROWS", "tap to submit"],
    constraints: {
      hiddenElements: ['action-icons', 'key-letters'],
      disabledActions: [],
      forcedGameConfig: { 
        initialWord: 'WORS',
        maxTurns: 20,
        allowBotPlayer: true,
        enableKeyLetters: true,
        enableLockedLetters: true,
        botId: 'basicBot'
      },
      letterOpacity: {},
      allowedLetters: [],
      disableLetterRemoval: true
    },
    completionCondition: (_gameState, tutorialState: TutorialState) => {
      // Step 3 completes when user has "ROWS" in their submitted words
      return tutorialState.submittedWords.includes('ROWS');
    }
  },
  {
    id: 4,
    instructions: ["key letter +1", "& locked next turn", "", "15 turns each", "high score wins"],
    constraints: {
      hiddenElements: [], // No hidden elements - full game experience
      disabledActions: [], // No disabled actions - full game experience
      forcedGameConfig: { 
        initialWord: '', // Continue from Step 3 result
        maxTurns: 15, // Real game turn limit
        allowBotPlayer: true,
        enableKeyLetters: true,
        enableLockedLetters: true,
        botId: 'basicBot'
      },
      letterOpacity: {}, // No opacity constraints - full game experience
      allowedLetters: [], // No letter restrictions - full game experience
      disableLetterRemoval: false // Full letter removal enabled
    },
    completionCondition: (_gameState, tutorialState: TutorialState) => {
      // Step 4 completes when user has submitted a word after Step 3 completion
      // We track this by checking if the human submitted words has grown beyond just "ROWS"
      return tutorialState.submittedWords.includes('ROWS') && 
             tutorialState.submittedWords.length >= 2; // At least ROWS + one more human word
    }
  },
  {
    id: 5,
    instructions: ["thanks & have fun"],
    constraints: {
      hiddenElements: [], // No hidden elements - full game experience
      disabledActions: [], // No disabled actions - full game experience
      forcedGameConfig: { 
        initialWord: '', // Continue from Step 4 result
        maxTurns: 15, // Real game turn limit
        allowBotPlayer: true,
        enableKeyLetters: true,
        enableLockedLetters: true,
        botId: 'basicBot'
      },
      letterOpacity: {}, // No opacity constraints - full game experience
      allowedLetters: [], // No letter restrictions - full game experience
      disableLetterRemoval: false // Full letter removal enabled
    },
    completionCondition: (_gameState, tutorialState: TutorialState) => {
      // Step 5 completes when user submits any word (tutorial ends)
      return tutorialState.submittedWords.includes('ROWS') && 
             tutorialState.submittedWords.length >= 3; // At least ROWS + 2 more human words
    }
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onComplete,
  onNavigateHome,
  onGameEnd
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [gameState, setGameState] = useState<any>(null);
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    lastPendingWord: '',
    submittedWords: [],
    lastTurnHistoryLength: 0
  });
  const [tutorialComplete, setTutorialComplete] = useState<boolean>(false);
  


  const currentTutorialStep = TUTORIAL_STEPS.find(step => step.id === currentStep);

  // Enhanced game state change handler that tracks submitted words
  const handleGameStateChange = useCallback((newGameState: any) => {
    setGameState(newGameState);
    
    // Track submitted words using turn history
    if (newGameState && newGameState.turnHistory) {
      const currentTurnHistoryLength = newGameState.turnHistory.length;
      
      if (currentTurnHistoryLength > tutorialState.lastTurnHistoryLength) {
        // New word(s) have been submitted - only count human player moves
        const newSubmittedWords = newGameState.turnHistory
          .slice(tutorialState.lastTurnHistoryLength)
          .filter((turn: any) => turn.playerId === 'human')
          .map((turn: any) => turn.newWord);
        
        // Track human word submissions for tutorial progression
        
        setTutorialState((prev: TutorialState) => ({
          ...prev,
          submittedWords: [...prev.submittedWords, ...newSubmittedWords],
          lastTurnHistoryLength: currentTurnHistoryLength
        }));
      }
    }
    
    // Track the pending word by monitoring the word builder
    const wordBuilderElement = document.querySelector('.word-builder');
    if (wordBuilderElement) {
      const letters = wordBuilderElement.querySelectorAll('.word-builder__letter');
      const currentPendingWord = Array.from(letters).map(letter => letter.textContent).join('');
      
      if (currentPendingWord && currentPendingWord !== tutorialState.lastPendingWord) {
        setTutorialState((prev: TutorialState) => ({
          ...prev,
          lastPendingWord: currentPendingWord
        }));
      }
    }
  }, [tutorialState.lastPendingWord, tutorialState.lastTurnHistoryLength]);

  // Monitor for step completion
  useEffect(() => {
    if (currentTutorialStep && gameState && tutorialState.lastPendingWord) {
      const isStepComplete = currentTutorialStep.completionCondition(gameState, tutorialState);
      
      // Check tutorial step completion
      
      if (isStepComplete && !tutorialComplete) {
        // Step completed, advance tutorial
        
        if (currentStep < TUTORIAL_STEPS.length) {
          // Move to next step
          setTimeout(() => {
            setCurrentStep(currentStep + 1);
            // Move to next tutorial step
          }, 500); // Small delay to ensure the user sees the completion
        } else {
          // Tutorial complete - just hide instructions, same game continues
          setTimeout(() => {
            setTutorialComplete(true);
            // Tutorial instructions hidden, same game continues
          }, 1000); // Give user time to see the "thanks & have fun" message
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
          // Track pending word changes for early steps completion
          setTutorialState((prev: TutorialState) => ({
            ...prev,
            lastPendingWord: currentPendingWord
          }));
        }
      }
    };

    // Check immediately and then set up periodic checking
    checkPendingWord();
    const interval = setInterval(checkPendingWord, 200);

    return () => clearInterval(interval);
  }, [tutorialState.lastPendingWord]);

  const handleGameEnd = useCallback((winner: string | null, finalScores: { human: number, bot: number }) => {
    // Game ended naturally - let InteractiveGame show winner/loser screen
    // User can then click "Home" button to return to main menu
    console.log('[Tutorial] Game ended - winner:', winner, 'scores:', finalScores);
    onGameEnd?.(winner, finalScores);
  }, [onGameEnd]);

  const handleResign = useCallback(() => {
    // Allow resignation from tutorial
    onComplete();
  }, [onComplete]);



  if (!currentTutorialStep) {
    return null;
  }

  return (
    <div className="tutorial-overlay">
      {/* Tutorial Instructions - hidden after tutorial completes */}
      {!tutorialComplete && (
        <TutorialInstructions 
          text={currentTutorialStep.instructions}
        />
      )}
      
      {/* Game - keep step styling even after tutorial completes */}
      <div className={`tutorial-overlay__game tutorial-overlay--step-${currentStep}`}>
        <InteractiveGame
          config={currentTutorialStep.constraints.forcedGameConfig}
          onGameEnd={handleGameEnd}
          onResign={handleResign}
          onNavigateHome={onNavigateHome}
          currentGameMode="tutorial"
          onStartGame={() => {}} // Disable game switching during tutorial
          onGameStateChange={handleGameStateChange}
          disableLetterRemoval={currentStep === 3}
        />
      </div>
    </div>
  );
}; 