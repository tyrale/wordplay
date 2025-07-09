import React, { useState } from 'react';
import { ThemeProvider, InteractiveGame, MainScreen } from './components';
import { ChallengeGame } from './components/challenge/ChallengeGame';
import { ConfirmationDialog } from './components/ui/ConfirmationDialog';
import { AnimationProvider } from './animations';
import { UnlockProvider } from './components/unlock/UnlockProvider';
import ResponsiveTest from './components/game/ResponsiveTest';
import { QuitterOverlay } from './components/ui/QuitterOverlay';
import { initViewportHeight } from './utils/viewportHeight';
import { ToastProvider } from './components/ui/ToastManager';
import './App.css';

type AppState = 'main' | 'game' | 'challenge' | 'quitter';

interface ConfirmationState {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

function App() {
  const [appState, setAppState] = useState<AppState>('main');
  const [selectedBotId, setSelectedBotId] = useState<string>('tester');
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    isVisible: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmationState({
      isVisible: true,
      title,
      message,
      onConfirm
    });
  };

  const hideConfirmation = () => {
    setConfirmationState(prev => ({ ...prev, isVisible: false }));
  };

  const handleStartGame = (gameType: 'bot' | 'challenge', botId?: string) => {
    if (gameType === 'bot' && botId) {
      // Check if we need confirmation for game transition
      if (appState === 'challenge') {
        showConfirmation(
          'Start New Game?',
          `Do you want to exit the current challenge and start a new game with ${botId}?`,
          () => {
            setSelectedBotId(botId);
            setAppState('game');
            hideConfirmation();
          }
        );
      } else if (appState === 'game') {
        // Already in bot game - switch directly to new bot
        setSelectedBotId(botId);
        setAppState('game');
      } else {
        // No current game, start directly
        setSelectedBotId(botId);
        setAppState('game');
      }
    } else if (gameType === 'challenge') {
      if (appState === 'game') {
        showConfirmation(
          'Start Challenge?',
          'Do you want to end the current game and start today\'s challenge?',
          () => {
            setAppState('challenge');
            hideConfirmation();
          }
        );
      } else {
        // No current game or already in challenge, start directly
        setAppState('challenge');
      }
    }
  };

  const handleGameEnd = (_winner: string | null, _finalScores: { human: number; bot: number }) => {
    // Return to main screen after game ends
    setAppState('main');
  };

  const handleChallengeComplete = (completed: boolean, stepCount: number) => {
    console.log(`Challenge ${completed ? 'completed' : 'ended'} in ${stepCount} steps`);
    // Challenge completion is handled within the ChallengeGame component
    // Return to main when user clicks back
  };

  const handleChallengeBack = () => {
    // Return to main screen from challenge
    setAppState('main');
  };

  const handleNavigateHome = () => {
    // Navigate directly to main screen without confirmation
    setAppState('main');
  };

  const handleResign = () => {
    // Show the quitter overlay animation (for bot games only)
    setAppState('quitter');
  };

  const handleQuitterComplete = () => {
    // Return to main screen after quitter animation completes
    setAppState('main');
  };

  const handleResetChallenge = () => {
    // Reset challenge and reload if in challenge mode
    if (appState === 'challenge') {
      // Force re-render of challenge component by toggling state
      setAppState('main');
      setTimeout(() => setAppState('challenge'), 100);
    }
  };

  // Initialize viewport height handling
  React.useEffect(() => {
    initViewportHeight();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <UnlockProvider>
          <AnimationProvider initialTheme="default">
            <ResponsiveTest>
              {appState === 'main' && (
                <MainScreen onStartGame={handleStartGame} />
              )}
              {appState === 'game' && (
                <InteractiveGame 
                  config={{ 
                    maxTurns: 20,
                    allowBotPlayer: true,
                    enableKeyLetters: true,
                    enableLockedLetters: true,
                    botId: selectedBotId
                  }}
                  onGameEnd={handleGameEnd}
                  onResign={handleResign}
                  onNavigateHome={handleNavigateHome}
                  currentGameMode="bot"
                  onStartGame={handleStartGame}
                />
              )}
              {appState === 'challenge' && (
                <ChallengeGame
                  onComplete={handleChallengeComplete}
                  onBack={handleChallengeBack}
                  onNavigateHome={handleNavigateHome}
                  onResetChallenge={handleResetChallenge}
                  onStartGame={handleStartGame}
                />
              )}
              
              {/* Confirmation Dialog */}
              <ConfirmationDialog
                isVisible={confirmationState.isVisible}
                title={confirmationState.title}
                message={confirmationState.message}
                onConfirm={confirmationState.onConfirm}
                onCancel={hideConfirmation}
              />
              
              {/* Quitter Overlay */}
              <QuitterOverlay 
                isVisible={appState === 'quitter'}
                onComplete={handleQuitterComplete}
              />
            </ResponsiveTest>
          </AnimationProvider>
        </UnlockProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
