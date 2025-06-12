import React, { useState } from 'react';
import { ThemeProvider, InteractiveGame, MainScreen } from './components';
import { AnimationProvider } from './animations';
import { UnlockProvider } from './components/unlock/UnlockProvider';
import ResponsiveTest from './components/game/ResponsiveTest';
import { QuitterOverlay } from './components/ui/QuitterOverlay';
import { initViewportHeight } from './utils/viewportHeight';
import './App.css';

type AppState = 'main' | 'game' | 'quitter';

function App() {
  const [appState, setAppState] = useState<AppState>('main');
  const [selectedBotId, setSelectedBotId] = useState<string>('tester');

  const handleStartGame = (gameType: 'bot', botId?: string) => {
    if (gameType === 'bot' && botId) {
      setSelectedBotId(botId);
      setAppState('game');
    }
  };

  const handleGameEnd = (_winner: string | null, _finalScores: { human: number; bot: number }) => {
    // Return to main screen after game ends
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
            <QuitterOverlay 
              isVisible={appState === 'quitter'}
              onComplete={handleQuitterComplete}
            />
          </ResponsiveTest>
        </AnimationProvider>
      </UnlockProvider>
    </ThemeProvider>
  );
}

export default App;
