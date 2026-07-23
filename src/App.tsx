import React, { useMemo, useState } from 'react';
import { ThemeProvider, InteractiveGame, MainScreen, MultiplayerLobby, MultiplayerGame } from './components';
import type { MultiplayerGameResult } from './components/multiplayer/MultiplayerGame';
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
import { clearActiveGame } from './adapters/browserGameSaveAdapter';
import type { GameState } from '../packages/engine/interfaces';
import './App.css';

type AppState = 'main' | 'game' | 'challenge' | 'quitter' | 'winner' | 'loser' | 'multiplayer-lobby' | 'multiplayer-game' | 'multiplayer-resigned';

interface ConfirmationState {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

/** Reads the active multiplayer game id from the URL, if present, so a page
 * refresh during a multiplayer game re-enters that game instead of losing
 * your place and bouncing back to the main menu. */
function getMultiplayerGameIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('mgame');
}

function App() {
  const initialMultiplayerGameId = getMultiplayerGameIdFromUrl();
  const [appState, setAppState] = useState<AppState>(initialMultiplayerGameId ? 'multiplayer-game' : 'main');
  const [selectedBotId, setSelectedBotId] = useState<string>('basicBot');
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(initialMultiplayerGameId);
  const [gameResults, setGameResults] = useState<{
    winner: string | null;
    finalScores: { human: number; bot: number };
    botName?: string;
  } | null>(null);
  // Tracks whether the winner/loser overlay currently showing is for a
  // vs-human multiplayer game, so closing it returns to the multiplayer
  // lobby (the "last view") instead of the main menu.
  const [isMultiplayerResult, setIsMultiplayerResult] = useState(false);

  // Tutorial: layered on top of a real bot game (not a separate game instance)
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStepId, setTutorialStepId] = useState(1);
  const [tutorialGameState, setTutorialGameState] = useState<GameState | null>(null);
  // Bumped every time a bot/tutorial game should start completely fresh (even if
  // InteractiveGame is already mounted with the same botId) - forces React to
  // remount it, which discards the old game manager instead of silently
  // continuing an in-progress game underneath the tutorial's forced start word.
  const [gameInstanceKey, setGameInstanceKey] = useState(0);
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
    setGameInstanceKey(prev => prev + 1);
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
            setGameInstanceKey(prev => prev + 1);
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
        setGameInstanceKey(prev => prev + 1);
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
    // Resigning abandons the in-progress bot game without it ever reaching
    // 'finished' status, so the auto-save (which only clears on finish)
    // would otherwise still be sitting in storage. Without clearing it here,
    // starting a new bot game afterwards would restore the resigned game
    // instead of beginning fresh. Show the quitter overlay animation (for
    // bot games only).
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on resign:', err));
    setAppState('quitter');
  };

  const handleStartMultiplayer = () => {
    setAppState('multiplayer-lobby');
  };

  const handleMultiplayerGameReady = (gameId: string) => {
    setMultiplayerGameId(gameId);
    setAppState('multiplayer-game');
    const url = new URL(window.location.href);
    url.searchParams.set('mgame', gameId);
    window.history.replaceState({}, '', url.toString());
  };

  const handleMultiplayerExit = () => {
    setMultiplayerGameId(null);
    setAppState('main');
    const url = new URL(window.location.href);
    url.searchParams.delete('mgame');
    window.history.replaceState({}, '', url.toString());
  };

  // Vs-human multiplayer game finished - show the same winner/loser overlay
  // used for bot games, but return to the multiplayer lobby (the "last
  // view") instead of the main menu once it's dismissed. A resignation
  // (by either player) shows a distinct "match ended" overlay instead,
  // since it isn't a fairly-earned win/lose result.
  const handleMultiplayerGameEnd = ({ winnerId, localPlayerId, localScore, opponentScore, opponentName, resigned }: MultiplayerGameResult) => {
    setIsMultiplayerResult(true);

    if (resigned) {
      setAppState('multiplayer-resigned');
      return;
    }

    setGameResults({
      winner: winnerId === null ? null : winnerId === localPlayerId ? 'human' : 'bot',
      finalScores: { human: localScore, bot: opponentScore },
      botName: opponentName
    });
    setAppState(winnerId === localPlayerId ? 'winner' : 'loser');
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

  // Clears the finished multiplayer game id/URL and returns to the lobby -
  // used once the winner/loser overlay for a vs-human game is dismissed.
  const returnToMultiplayerLobby = () => {
    setMultiplayerGameId(null);
    setIsMultiplayerResult(false);
    setAppState('multiplayer-lobby');
    const url = new URL(window.location.href);
    url.searchParams.delete('mgame');
    window.history.replaceState({}, '', url.toString());
  };

  const handleWinnerComplete = () => {
    if (isMultiplayerResult) {
      returnToMultiplayerLobby();
    } else {
      setAppState('main');
    }
    setGameResults(null);
  };

  const handleLoserComplete = () => {
    if (isMultiplayerResult) {
      returnToMultiplayerLobby();
    } else {
      setAppState('main');
    }
    setGameResults(null);
  };

  // Both players (whoever resigned, and their opponent, whose client learns
  // of it via realtime sync) land on the same "match ended" overlay, then
  // both return to the multiplayer lobby.
  const handleMultiplayerResignedComplete = () => {
    returnToMultiplayerLobby();
  };

  // Pick a random phrase each time a win/lose/quit screen is shown (not on every re-render)
  const quitCopy = useMemo(() => pickAlertVariant(alertCopy.quit), [appState === 'quitter']);
  const winCopy = useMemo(() => pickAlertVariant(alertCopy.win), [appState === 'winner']);
  const loseCopy = useMemo(
    () => pickAlertVariant(isMultiplayerResult ? alertCopy.losePvp : alertCopy.lose),
    [appState === 'loser']
  );

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
                <MultiplayerGame
                  gameId={multiplayerGameId}
                  onExit={handleMultiplayerExit}
                  onGameEnd={handleMultiplayerGameEnd}
                />
              )}
              {appState === 'game' && (
                <div
                  key={gameInstanceKey}
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
                    currentGameMode={tutorialActive ? 'tutorial' : 'bot'}
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

              {/* Multiplayer Resigned Overlay - shown to both players when either resigns mid-game */}
              <AlertOverlay
                isVisible={appState === 'multiplayer-resigned'}
                lines={[...alertCopy.multiplayerResigned.lines]}
                onClose={handleMultiplayerResignedComplete}
                meta={alertCopy.multiplayerResigned.meta}
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
