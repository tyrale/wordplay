import React, { useState } from 'react';
import { ThemeProvider, InteractiveGame, MainScreen } from './components';
import { ChallengeGame } from './components/challenge/ChallengeGame';
import { AnimationProvider } from './animations';
import { UnlockProvider } from './components/unlock/UnlockProvider';
import ResponsiveTest from './components/game/ResponsiveTest';
import { QuitterOverlay } from './components/ui/QuitterOverlay';
import { initViewportHeight } from './utils/viewportHeight';
import { ToastProvider } from './components/ui/ToastManager';
import './App.css';

type AppState = 'main' | 'game' | 'challenge' | 'quitter';

function App() {
  const [appState, setAppState] = useState<AppState>('main');
  const [selectedBotId, setSelectedBotId] = useState<string>('tester');

  const handleStartGame = (gameType: 'bot' | 'challenge', botId?: string) => {
    if (gameType === 'bot' && botId) {
      setSelectedBotId(botId);
      setAppState('game');
    } else if (gameType === 'challenge') {
      setAppState('challenge');
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

  const handleResign = () => {
    // Show the quitter overlay animation
    setAppState('quitter');
  };

  const handleQuitterComplete = () => {
    // Return to main screen after quitter animation completes
    setAppState('main');
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
                    maxTurns: 10,
                    allowBotPlayer: true,
                    enableKeyLetters: true,
                    enableLockedLetters: true,
                    botId: selectedBotId
                  }}
                  onGameEnd={handleGameEnd}
                  onResign={handleResign}
                />
              )}
              {appState === 'challenge' && (
                <ChallengeGame
                  onComplete={handleChallengeComplete}
                  onBack={handleChallengeBack}
                />
              )}
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
