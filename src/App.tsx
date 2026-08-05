import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProvider, useTheme, InteractiveGame, MainScreen, MultiplayerLobby, MultiplayerGame } from './components';
import type { MultiplayerGameResult } from './components/multiplayer/MultiplayerGame';
import { ChallengeGame } from './components/challenge/ChallengeGame';
import { ZenGame } from './components/zen/ZenGame';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { TUTORIAL_INITIAL_CONFIG } from './components/tutorial/tutorialSteps';
import { AnimationProvider } from './animations';
import { UnlockProvider, useUnlockSystem } from './components/unlock/UnlockProvider';
import { VanityFilterProvider } from './contexts/VanityFilterContext';
import { MechanicsSettingsProvider } from './contexts/MechanicsSettingsContext';
import { RoundLengthProvider, useRoundLength } from './contexts/RoundLengthContext';
import ResponsiveTest from './components/game/ResponsiveTest';
import { AlertOverlay } from './components/ui/AlertOverlay';
import { alertCopy, pickAlertVariant } from './content/alertCopy';
import { getBotDisplayName } from './data/botRegistry';
import { initViewportHeight } from './utils/viewportHeight';
import { hasSeenTutorial, markTutorialSeen } from './utils/tutorialStorage';
import { AlertProvider } from './components/ui/AlertProvider';
import { clearActiveGame } from './adapters/browserGameSaveAdapter';
import { ensureAnonymousSession } from './adapters/supabaseAuthAdapter';
import type { GameState } from '../packages/engine/interfaces';
import { defaultTheme } from './types/theme';
import { BOSS_BATTLE_MAX_TURNS, BOSS_STAGES, BOSS_THEME_NAMES, getBossTheme, getThemeByName } from './data/bossBattle';
import type { BossStage } from './data/bossBattle';
import { useBossMusic } from './hooks/useBossMusic';
import './App.css';

type AppState = 'main' | 'game' | 'challenge' | 'zen' | 'quitter' | 'winner' | 'loser' | 'multiplayer-lobby' | 'multiplayer-game' | 'multiplayer-resigned' | 'boss';

/**
 * Sub-state of the "GUS" boss battle encounter (only meaningful while
 * appState === 'boss'). 'battle' renders the boss InteractiveGame; the rest
 * render a full-screen AlertOverlay and tear down the board.
 */
type BossPhase = 'idle' | 'intro' | 'battle' | 'advance' | 'victory' | 'defeat' | 'timeout';

interface ConfirmationState {
  isVisible: boolean;
  lines: string[];
  meta?: string;
  onConfirm: () => void;
}

/** Reads the active multiplayer game id from the URL, if present, so a page
 * refresh during a multiplayer game re-enters that game instead of losing
 * your place and bouncing back to the main menu. */
function getMultiplayerGameIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('mgame');
}

function AppContent() {
  const { roundLength } = useRoundLength();
  const { currentTheme, setTheme } = useTheme();
  const { isUnlocked, isLoading: unlocksLoading } = useUnlockSystem();
  const initialMultiplayerGameId = getMultiplayerGameIdFromUrl();
  const [appState, setAppState] = useState<AppState>(initialMultiplayerGameId ? 'multiplayer-game' : 'main');
  const [selectedBotId, setSelectedBotId] = useState<string>('basicBot');
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(initialMultiplayerGameId);
  const [gameResults, setGameResults] = useState<{
    winner: string | null;
    finalScores: { human: number; bot: number };
    botName?: string;
    /** Full scoreboard for multiplayer games with 3+ players, so the
     * end-of-game overlay can list everyone rather than just you + one
     * opponent. */
    allPlayers?: { id: string; name: string; score: number; isLocal: boolean }[];
  } | null>(null);
  // Tracks whether the winner/loser overlay currently showing is for a
  // vs-human multiplayer game, so closing it returns to the multiplayer
  // lobby (the "last view") instead of the main menu.
  const [isMultiplayerResult, setIsMultiplayerResult] = useState(false);

  // "GUS" boss battle encounter state. This is a transient, retryable chain
  // (boss -> megaboss -> gigaboss), NOT a permanent unlock. Playing GUS grants
  // one fresh chance; losing/resigning/timing out wipes the chain and reverts
  // the theme. Permanently unlocking boss-bot + the three themes only happens
  // after beating gigaboss (see unlock-definitions.ts, beat_giga_boss_bot).
  const [bossPhase, setBossPhase] = useState<BossPhase>('idle');
  const [bossStage, setBossStage] = useState<BossStage>('boss');
  // Theme name to restore if the player loses/resigns/times out (the theme
  // they had immediately before GUS triggered the encounter). Null only
  // outside an active encounter.
  const [bossPrevThemeName, setBossPrevThemeName] = useState<string | null>(null);
  // Bumped per boss battle so each stage mounts a fresh InteractiveGame.
  const [bossBattleKey, setBossBattleKey] = useState(0);

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
    lines: [],
    onConfirm: () => {}
  });

  const showConfirmation = (lines: string[], meta: string | undefined, onConfirm: () => void) => {
    setConfirmationState({
      isVisible: true,
      lines,
      meta,
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

  const handleStartGame = (gameType: 'bot' | 'challenge' | 'tutorial' | 'zen', botId?: string) => {
    if (gameType === 'bot' && botId) {
      // Check if we need confirmation for game transition
      if (appState === 'challenge' || appState === 'zen') {
        showConfirmation(
          ['START', 'NEW', 'GAME?'],
          `Exit ${appState === 'zen' ? 'zen mode' : 'the current challenge'} and play ${getBotDisplayName(botId)}?`,
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
          ['START', 'CHALLENGE?'],
          'Exit the current game and start today\'s challenge?',
          () => {
            setAppState('challenge');
            hideConfirmation();
          }
        );
      } else {
        // No current game or already in challenge, start directly
        setAppState('challenge');
      }
    } else if (gameType === 'zen') {
      if (appState === 'game') {
        showConfirmation(
          ['START', 'ZEN?'],
          'Exit the current game and play zen mode?',
          () => {
            setAppState('zen');
            hideConfirmation();
          }
        );
      } else {
        // No current game or already in zen, start directly
        setAppState('zen');
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

  // ---------------------------------------------------------------------------
  // "GUS" boss battle encounter handlers
  // ---------------------------------------------------------------------------

  /** Apply a boss stage's GameTheme immediately. */
  const applyBossTheme = (stage: BossStage) => {
    const theme = getBossTheme(stage);
    setTheme(theme);
  };

  /** Restore the theme the player had before GUS triggered the encounter. */
  const revertBossTheme = () => {
    if (bossPrevThemeName) {
      const prev = getThemeByName(bossPrevThemeName);
      if (prev) setTheme(prev);
    } else {
      setTheme(defaultTheme);
    }
  };

  // GUS was just submitted in any game mode (bot, challenge, multiplayer,
  // tutorial). Snapshot the current theme, apply the boss theme immediately,
  // and show the intro alert. Closing the alert abandons the in-progress game
  // and drops the player straight into the boss fight. Retryable: every GUS
  // play grants a fresh chance.
  const handleBossTrigger = (word: string) => {
    if (word.toUpperCase() !== 'GUS') return;
    // Ignore if an encounter is already in progress.
    if (bossPhase !== 'idle') return;

    // If triggered from a vs-human multiplayer game, clear its id + URL param
    // so returning to main after the boss doesn't re-enter the abandoned match.
    // (The multiplayer manager resigns the match server-side before this fires
    // - see MultiplayerGame's onBossTrigger wrapper - so the opponent is
    // notified; here we just drop the local references.)
    if (appState === 'multiplayer-game') {
      setMultiplayerGameId(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('mgame');
      window.history.replaceState({}, '', url.toString());
    }

    setBossPrevThemeName(currentTheme.name);
    setBossStage('boss');
    applyBossTheme('boss');
    setBossPhase('intro');
    setAppState('boss');
    // The game GUS was played in is being abandoned - clear its single-player
    // auto-save so starting a new bot game later begins fresh instead of
    // restoring the abandoned (unfinished) game. (No-op for multiplayer.)
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on boss trigger:', err));
  };

  // Intro alert closed (X) -> start the first boss battle.
  const startBossBattle = () => {
    setBossBattleKey(k => k + 1);
    setBossPhase('battle');
  };

  // Advance alert closed (X) -> start the next stage's boss battle.
  const advanceBossBattle = () => {
    setBossBattleKey(k => k + 1);
    setBossPhase('battle');
  };

  // A boss battle reached 20 turns. Per the spec the player must have MORE
  // points than the boss to win - a tie counts as a loss (the engine's
  // `winner` is ambiguous on ties, so we decide strictly from the scores).
  // Win advances the chain (or ends it victoriously at giga); lose/tie ends
  // the encounter in defeat.
  const handleBossGameEnd = (_winner: string | null, finalScores: { human: number; bot: number }) => {
    if (finalScores.human > finalScores.bot) {
      const next = BOSS_STAGES[bossStage].next;
      if (next) {
        // Apply the next (harder) stage's theme right away so the advance
        // alert already feels like an escalation.
        setBossStage(next);
        applyBossTheme(next);
        setBossPhase('advance');
      } else {
        // Beat gigaboss - keep the giga theme as the reward (do NOT revert).
        // The permanent boss-bot + theme unlocks fire via handleGameCompletion
        // inside InteractiveGame (beat_giga_boss_bot achievement).
        setBossPhase('victory');
      }
    } else {
      revertBossTheme();
      setBossPhase('defeat');
    }
  };

  // The whole-game boss countdown hit zero -> player loses by timeout.
  const handleBossTimeout = () => {
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on boss timeout:', err));
    revertBossTheme();
    setBossPhase('timeout');
  };

  // Resigned mid-boss-battle -> same as a loss (encounter ends, theme reverts).
  const handleBossResign = () => {
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on boss resign:', err));
    revertBossTheme();
    setBossPhase('defeat');
  };

  // Victory/defeat/timeout overlay closed -> return to the main screen and
  // reset the encounter state so the next GUS play starts a fresh chain.
  const endBoss = () => {
    setAppState('main');
    setBossPhase('idle');
    setBossStage('boss');
    setBossPrevThemeName(null);
  };

  // Boss battle music - an original, escalating procedural "final-countdown"-style
  // synth motif (Web Audio API, no audio assets). Owned by App (not InteractiveGame)
  // so it starts on the intro/advance overlay BEFORE each battle, plays continuously
  // across the alert + the battle, escalates per stage (boss -> mega -> giga), and
  // stops when the encounter resolves (victory/defeat/timeout). bossStage is already
  // advanced to the upcoming stage before the advance alert shows, so each alert
  // plays the music for the battle it's introducing.
  const bossMusicActive = appState === 'boss' &&
    (bossPhase === 'intro' || bossPhase === 'battle' || bossPhase === 'advance');
  useBossMusic({ enabled: bossMusicActive, stage: bossMusicActive ? bossStage : null });

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
  const handleMultiplayerGameEnd = ({ winnerId, localPlayerId, localScore, opponentScore, opponentName, resigned, allPlayers }: MultiplayerGameResult) => {
    setIsMultiplayerResult(true);

    if (resigned) {
      setAppState('multiplayer-resigned');
      return;
    }

    setGameResults({
      winner: winnerId === null ? null : winnerId === localPlayerId ? 'human' : 'bot',
      finalScores: { human: localScore, bot: opponentScore },
      botName: opponentName,
      allPlayers
    });
    setAppState(winnerId === localPlayerId ? 'winner' : 'loser');
  };

  const handleQuitterComplete = () => {
    // Return to main screen after quitter animation completes
    setAppState('main');
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

  // End-of-game score breakdown for the winner/loser overlays. For multiplayer
  // games with a full scoreboard (3+ players), lists everyone sorted by
  // score; otherwise falls back to the simple you-vs-bot/opponent display.
  const renderGameResultsMeta = () => {
    if (!gameResults?.finalScores) return null;
    if (gameResults.allPlayers && gameResults.allPlayers.length > 2) {
      const sorted = [...gameResults.allPlayers].sort((a, b) => b.score - a.score);
      return (
        <>
          {sorted.map(player => (
            <div key={player.id}>
              {player.isLocal ? 'You' : player.name}: {player.score}
            </div>
          ))}
        </>
      );
    }
    return (
      <>
        <div>You: {gameResults.finalScores.human}</div>
        <div>{gameResults.botName || 'Bot'}: {gameResults.finalScores.bot}</div>
      </>
    );
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

  // Silently establish an anonymous Supabase identity for every session (not
  // just multiplayer), so single-player unlocks also count toward the
  // community-wide unlock stats. No-ops if Supabase isn't configured.
  React.useEffect(() => {
    ensureAnonymousSession().catch(err => console.warn('Failed to establish anonymous session:', err));
  }, []);

  // Reload guard: if the app was reloaded while a boss battle was mid-flight,
  // the saved theme will be a boss theme (boss/megaboss/gigaboss) that the
  // player hasn't permanently unlocked (those only unlock on a giga win). In
  // that case restore the default theme so the player isn't stuck in a boss
  // theme with no active encounter. Runs once after unlock state loads; an
  // active encounter handled by the live state machine (bossPhase !== 'idle')
  // is left alone.
  const bossGuardRanRef = useRef(false);
  useEffect(() => {
    if (unlocksLoading || bossGuardRanRef.current) return;
    bossGuardRanRef.current = true;
    if (bossPhase !== 'idle') return;
    if (BOSS_THEME_NAMES.includes(currentTheme.name) && !isUnlocked('theme', currentTheme.name)) {
      setTheme(defaultTheme);
    }
  }, [unlocksLoading, bossPhase, currentTheme, isUnlocked, setTheme]);

  return (
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
                  onBossTrigger={handleBossTrigger}
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
                            maxTurns: roundLength,
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
                    // GUS triggers the boss battle encounter from any game mode.
                    onBossTrigger={handleBossTrigger}
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
              {appState === 'boss' && bossPhase === 'battle' && (
                <div
                  key={bossBattleKey}
                  className={`game-screen boss-battle boss-battle--${bossStage}`}
                  data-boss-stage={bossStage}
                  data-boss-theme={BOSS_STAGES[bossStage].themeName}
                >
                  <InteractiveGame
                    config={{
                      maxTurns: BOSS_BATTLE_MAX_TURNS,
                      allowBotPlayer: true,
                      enableKeyLetters: true,
                      enableLockedLetters: true,
                      botId: BOSS_STAGES[bossStage].botId,
                      // Whole-game countdown for this boss stage (90/60/45s).
                      gameTimeLimitSeconds: BOSS_STAGES[bossStage].timeLimitSeconds
                    }}
                    onGameEnd={handleBossGameEnd}
                    onResign={handleBossResign}
                    onGameTimeout={handleBossTimeout}
                    onNavigateHome={handleNavigateHome}
                    currentGameMode="boss"
                    bossStage={bossStage}
                  />
                </div>
              )}
              {appState === 'challenge' && (
                <ChallengeGame
                  onComplete={handleChallengeComplete}
                  onBack={handleChallengeBack}
                  onNavigateHome={handleNavigateHome}
                  onStartGame={handleStartGame}
                  onBossTrigger={handleBossTrigger}
                />
              )}
              {appState === 'zen' && (
                <ZenGame
                  onNavigateHome={handleNavigateHome}
                  onStartGame={handleStartGame}
                />
              )}
              
              {/* Confirmation Alert */}
              <AlertOverlay
                isVisible={confirmationState.isVisible}
                lines={confirmationState.lines}
                meta={confirmationState.meta}
                actions={[{ label: 'yes', onClick: confirmationState.onConfirm }]}
                onClose={hideConfirmation}
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
                meta={renderGameResultsMeta()}
              />
              
              {/* Loser Overlay */}
              <AlertOverlay
                isVisible={appState === 'loser'}
                lines={[...loseCopy.lines]}
                variant="lose"
                onClose={handleLoserComplete}
                meta={renderGameResultsMeta()}
              />

              {/* Multiplayer Resigned Overlay - shown to both players when either resigns mid-game */}
              <AlertOverlay
                isVisible={appState === 'multiplayer-resigned'}
                lines={[...alertCopy.multiplayerResigned.lines]}
                onClose={handleMultiplayerResignedComplete}
                meta={alertCopy.multiplayerResigned.meta}
              />

              {/* "GUS" boss battle overlays. Each shows while appState === 'boss'
                  and the boss board is torn down (intro/advance) or just finished
                  (victory/defeat/timeout). Closing intro/advance starts the next
                  battle; closing victory/defeat/timeout returns to the main screen. */}
              <AlertOverlay
                isVisible={appState === 'boss' && bossPhase === 'intro'}
                lines={[...alertCopy.boss.intro.lines]}
                meta={alertCopy.boss.intro.meta}
                onClose={startBossBattle}
              />
              {/* Gigaboss lightning-reveal shadow on the advance overlay (the
                  buildup to the final boss). bossStage is already 'giga' here
                  (advanced before the alert shows). The actual battle renders
                  its own copy inside InteractiveGame; this one covers the alert. */}
              {appState === 'boss' && bossPhase === 'advance' && bossStage === 'giga' && (
                <div className="boss-monster-bg boss-monster-bg--app" aria-hidden="true">
                  <div className="boss-monster-bg__lightning" />
                  <svg
                    className="boss-monster-bg__silhouette"
                    viewBox="0 0 240 300"
                    preserveAspectRatio="xMidYMax meet"
                  >
                    <path
                      className="boss-monster-bg__body"
                      d="M 30 38 L 64 96 L 80 100 Q 120 74 160 100 L 176 96 L 210 38 L 197 112 L 224 140 L 207 154 L 216 200 L 199 236 L 189 300 L 51 300 L 41 236 L 24 200 L 33 154 L 16 140 L 43 112 Z"
                    />
                    <path
                      className="boss-monster-bg__eyes"
                      d="M 92 112 L 108 120 L 92 128 Z M 148 112 L 132 120 L 148 128 Z"
                    />
                  </svg>
                </div>
              )}
              <AlertOverlay
                isVisible={appState === 'boss' && bossPhase === 'advance'}
                lines={[...alertCopy.boss.advance.lines]}
                meta={alertCopy.boss.advance.meta}
                onClose={advanceBossBattle}
              />
              <AlertOverlay
                isVisible={appState === 'boss' && bossPhase === 'victory'}
                lines={[...alertCopy.boss.victory.lines]}
                meta={alertCopy.boss.victory.meta}
                variant="win"
                onClose={endBoss}
              />
              <AlertOverlay
                isVisible={appState === 'boss' && bossPhase === 'defeat'}
                lines={[...alertCopy.boss.defeat.lines]}
                meta={alertCopy.boss.defeat.meta}
                variant="lose"
                onClose={endBoss}
              />
              <AlertOverlay
                isVisible={appState === 'boss' && bossPhase === 'timeout'}
                lines={[...alertCopy.boss.timeout.lines]}
                meta={alertCopy.boss.defeat.meta}
                variant="lose"
                onClose={endBoss}
              />
                          </ResponsiveTest>
      </AnimationProvider>
      </MechanicsSettingsProvider>
    </VanityFilterProvider>
  );
}

function App() {
  return (
    <RoundLengthProvider>
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <AppContent />
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    </RoundLengthProvider>
  );
}

export default App;
