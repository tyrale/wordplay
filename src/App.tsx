import React from 'react';
import { ThemeProvider, InteractiveGame } from './components';
import { AnimationProvider } from './animations';
import ResponsiveTest from './components/game/ResponsiveTest';
import { initViewportHeight } from './utils/viewportHeight';
import './App.css';

function App() {
  const handleGameEnd = (winner: string | null, finalScores: { human: number; bot: number }) => {
    // Game ended - could show end screen or stats here
  };

  // Initialize viewport height handling
  React.useEffect(() => {
    initViewportHeight();
  }, []);

  return (
    <ThemeProvider>
      <AnimationProvider initialTheme="default">
        <ResponsiveTest>
          <InteractiveGame 
            config={{ 
              maxTurns: 10,
              allowBotPlayer: true,
              enableKeyLetters: true,
              enableLockedLetters: true
            }}
            onGameEnd={handleGameEnd}
          />
        </ResponsiveTest>
      </AnimationProvider>
    </ThemeProvider>
  );
}

export default App;
