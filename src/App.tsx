import React, { useMemo, useState } from 'react';
import { ThemeProvider, InteractiveGame, MainScreen, MultiplayerLobby, MultiplayerGame } from './components';
import { ChallengeGame } from './components/challenge/ChallengeGame';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { TUTORIAL_INITIAL_CONFIG } from './components/tutorial/tutorialSteps';
import { ConfirmationDialog } from './components/ui/ConfirmationDialog';
import { AnimationProvider } from './animations';
import { UnlockProvider } from './components/unlock/UnlockProvider';
import { VanityFilterProvider } from './contexts/VanityFilterContext';
import { MechanicsSettingsProvider } from './contexts/MechanicsSettingsContext';
import ResponsiveTest from './components/game/ResponsiveTest';
import { AlertOverlay } from './components/ui/AlertOverlay';
import { alertCopy, pickAlertVariant } from './content/alertCopy';
import { getBotDisplayName } from './data/botRegistry';
import { initViewportHeight } from './utils/viewportHeight';
import { hasSeenTutorial, markTutorialSeen } from './utils/tutorialStorage';
import { AlertProvider } from './components/ui/AlertProvider';
import type { GameState } from '../packages/engine/interfaces';
import './App.css';

type AppState = 'main' | 'game' | 'challenge' | 'quitter' | 'winner' | 'loser' | 'multiplayer-lobby' | 'multiplayer-game';

interface ConfirmationState {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

function App() {
  const [appState, setAppState] = useState<AppState>('main');
  const [selectedBotId, setSelectedBotId] = useState<string>('basicBot');
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null);
  const [gameResults, setGameResults] = useState<{
    winner: string | null;
    finalScores: { human: number; bot: number };
    botName?: string;
  } | null>(null);

  // Tutorial: layered on top of a real bot game (not a separate game instance)
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStepId, setTutorialStepId] = useState(1);
  const [tutorialGameState, setTutorialGameState] = useState<GameState | null>(null);
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

  // Begins a fresh bot game with the tutorial layer active on top of it (used for
  // first-time auto-trigger and for the "the basics" replay entry in the menu)
  const beginTutorialGame = (botId: string) => {
    setSelectedBotId(botId);
    setTutorialStepId(1);
    setTutorialGameState(null);
    setTutorialActive(true);
    setAppState('game');
  };

  const handleStartGame = (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => {
    if (gameType === 'bot' && botId) {
      // Check if we need confirmation for game transition
      if (appState === 'challenge') {
        showConfirmation(
          'Start New Game?',
          `Do you want to exit the current challenge and start a new game with ${botId}?`,
          () => {
            setSelectedBotId(botId);
            setTutorialActive(!hasSeenTutorial());
            setTutorialStepId(1);
            setTutorialGameState(null);
            setAppState('game');
            hideConfirmation();
          }
        );
      } else {
        // Already in a bot game, or no current game - start/switch directly.
        // Auto-trigger the tutorial the first time the user ever plays a bot.
        setSelectedBotId(botId);
        setTutorialActive(!hasSeenTutorial());
        setTutorialStepId(1);
        setTutorialGameState(null);
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
    } else if (gameType === 'tutorial') {
      // "the basics" in the menu - force-replay the tutorial on a fresh bot game
      beginTutorialGame(selectedBotId);
    }
  };

  const handleGameEnd = (winner: string | null, finalScores: { human: number; bot: number }) => {
    // Store game results for overlay display
    setGameResults({
      winner,
      finalScores,
      botName: getBotDisplayName(selectedBotId)
    });
    
    // Show appropriate overlay based on winner
    if (winner === 'human') {
      setAppState('winner');
    } else if (winner === 'bot') {
      setAppState('loser');
    } else {
      // Tie - could show loser or custom tie screen, for now show loser
      setAppState('loser');
    }
  };

  // Tutorial layer: skipping or completing just removes the overlay/restrictions
  // and marks it seen - the underlying bot game the user was already playing continues.
  const handleTutorialSkip = () => {
    markTutorialSeen();
    setTutorialActive(false);
  };

  const handleTutorialComplete = () => {
    markTutorialSeen();
    setTutorialActive(false);
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

  const handleStartMultiplayer = () => {
    setAppState('multiplayer-lobby');
  };

  const handleMultiplayerGameReady = (gameId: string) => {
    setMultiplayerGameId(gameId);
    setAppState('multiplayer-game');
  };

  const handleMultiplayerExit = () => {
    setMultiplayerGameId(null);
    setAppState('main');
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

  const handleWinnerComplete = () => {
    // Return to main screen after winner animation completes
    setAppState('main');
    setGameResults(null);
  };

  const handleLoserComplete = () => {
    // Return to main screen after loser animation completes
    setAppState('main');
    setGameResults(null);
  };

  // Pick a random phrase each time a win/lose/quit screen is shown (not on every re-render)
  const quitCopy = useMemo(() => pickAlertVariant(alertCopy.quit), [appState === 'quitter']);
  const winCopy = useMemo(() => pickAlertVariant(alertCopy.win), [appState === 'winner']);
  const loseCopy = useMemo(() => pickAlertVariant(alertCopy.lose), [appState === 'loser']);

  // Initialize viewport height handling
  React.useEffect(() => {
    initViewportHeight();
  }, []);

  return (
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <VanityFilterProvider>
            <MechanicsSettingsProvider>
            <AnimationProvider initialTheme="default">
              <ResponsiveTest>
              {appState === 'main' && (
                <MainScreen onStartGame={handleStartGame} onStartMultiplayer={handleStartMultiplayer} />
              )}
              {appState === 'multiplayer-lobby' && (
                <MultiplayerLobby onGameReady={handleMultiplayerGameReady} onBack={handleMultiplayerExit} />
              )}
              {appState === 'multiplayer-game' && multiplayerGameId && (
                <MultiplayerGame gameId={multiplayerGameId} onExit={handleMultiplayerExit} />
              )}
              {appState === 'game' && (
                <div
                  className={`game-screen${tutorialActive ? ' tutorial-active' : ''}`}
                  data-tutorial-step={tutorialActive ? tutorialStepId : undefined}
                >
                  <InteractiveGame
                    config={
                      tutorialActive
                        ? { ...TUTORIAL_INITIAL_CONFIG, botId: selectedBotId }
                        : {
                            maxTurns: 20,
                            allowBotPlayer: true,
                            enableKeyLetters: true,
                            enableLockedLetters: true,
                            botId: selectedBotId
                          }
                    }
                    onGameEnd={handleGameEnd}
                    onResign={handleResign}
                    onNavigateHome={handleNavigateHome}
                    currentGameMode="bot"
                    onStartGame={handleStartGame}
                    onGameStateChange={tutorialActive ? setTutorialGameState : undefined}
                    disableLetterRemoval={tutorialActive && tutorialStepId === 3}
                  />
                  {tutorialActive && (
                    <TutorialOverlay
                      gameState={tutorialGameState}
                      onSkip={handleTutorialSkip}
                      onComplete={handleTutorialComplete}
                      onStepChange={setTutorialStepId}
                    />
                  )}
                </div>
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
              <AlertOverlay
                isVisible={appState === 'quitter'}
                lines={[...quitCopy.lines]}
                onClose={handleQuitterComplete}
              />
              
              {/* Winner Overlay */}
              <AlertOverlay
                isVisible={appState === 'winner'}
                lines={[...winCopy.lines]}
                variant="win"
                onClose={handleWinnerComplete}
                meta={gameResults?.finalScores && (
                  <>
                    <div>You: {gameResults.finalScores.human}</div>
                    <div>{gameResults.botName || 'Bot'}: {gameResults.finalScores.bot}</div>
                  </>
                )}
              />
              
              {/* Loser Overlay */}
              <AlertOverlay
                isVisible={appState === 'loser'}
                lines={[...loseCopy.lines]}
                variant="lose"
                onClose={handleLoserComplete}
                meta={gameResults?.finalScores && (
                  <>
                    <div>You: {gameResults.finalScores.human}</div>
                    <div>{gameResults.botName || 'Bot'}: {gameResults.finalScores.bot}</div>
                  </>
                )}
              />
                          </ResponsiveTest>
            </AnimationProvider>
            </MechanicsSettingsProvider>
          </VanityFilterProvider>
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
