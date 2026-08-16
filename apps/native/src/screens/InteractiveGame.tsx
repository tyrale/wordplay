/**
 * Native InteractiveGame screen - Phase 2's "smallest complete gameplay
 * loop" (see docs/project/REACT_NATIVE_PORT_PLAN.md). Ports the core
 * interaction logic of apps/web's `components/game/InteractiveGame.tsx`
 * (word-builder state machine: pendingWord -> attemptMove -> submit/pass),
 * trimmed of everything not needed for a bare bot game: multiplayer and
 * the vanity filter aren't part of this port. The first-time tutorial and
 * the "GUS" boss battle's whole-game countdown *are* ported (see
 * `isTutorial` and `onGameTimeout`/`onBossTrigger` below).
 *
 * Interaction model differs from web's drag-and-drop (see AlphabetGrid.tsx
 * and CurrentWord.tsx doc comments): tap a grid letter to append it, tap
 * a letter in the current word to remove it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GameConfig, MoveAttempt } from '@wordplay/engine/interfaces';
import { useGameState, useWordState } from '../hooks/useGameState';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { AlphabetGrid } from '../components/AlphabetGrid';
import type { LetterState } from '../components/AlphabetGrid';
import { CurrentWord } from '../components/CurrentWord';
import type { LetterHighlight } from '../components/CurrentWord';
import { SubmitButton } from '../components/SubmitButton';
import { ScoreBar } from '../components/ScoreBar';
import { Menu } from '../components/Menu';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { useTutorialProgress } from '../hooks/useTutorialProgress';
import { markTutorialSeen } from '../utils/tutorialStorage';
import { triggerHapticFeedback } from '../utils/haptics';

const MAX_WORD_LENGTH = 10;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface InteractiveGameProps {
  /** Bot registry id (see @wordplay/engine/botRegistry) determining the
   * opponent's move-generation strategy - not just its display name. */
  botId?: string;
  botDisplayName?: string;
  /** Additional game config overrides (e.g. a forced `initialWord` for a
   * future tutorial flow) merged over this screen's defaults. Mirrors
   * web's InteractiveGameProps.config, which accepts a full GameConfig. */
  config?: Partial<GameConfig>;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
  /** The '←' action button - leaves immediately, no ceremony. Mirrors
   * web's `onNavigateHome` (distinct from `onResign` below - this is a
   * real distinction in web's InteractiveGame.tsx that a single `onExit`
   * callback had incorrectly collapsed into one in an earlier version of
   * this port, which is why resigning skipped the quitter AlertOverlay
   * entirely). */
  onNavigateHome?: () => void;
  /** The Menu's dedicated "resign" action - shows a quitter AlertOverlay
   * (handled by the caller, see App.tsx's GameScreenRoute) before
   * actually leaving. Mirrors web's `onResign`. */
  onResign?: () => void;
  /** Shows the scripted first-time tutorial banner on top of this game
   * (see hooks/tutorialSteps.ts and hooks/useTutorialProgress.ts). The
   * caller is responsible for deciding *when* to set this (e.g. the
   * first time the player ever starts a bot game) and for merging
   * `TUTORIAL_INITIAL_CONFIG` into `config` - this component only drives
   * the banner/skip/completion once told to. */
  isTutorial?: boolean;
  /** Called once the tutorial banner is dismissed (finished or skipped) -
   * this component already calls `markTutorialSeen()` itself first. */
  onTutorialComplete?: () => void;
  /** Fired when the whole-game boss countdown (config.gameTimeLimitSeconds)
   * reaches zero. The caller (BossBattleScreen) tears the game down in
   * response - this component doesn't decide what "timeout" means. */
  onGameTimeout?: () => void;
  /** Fired when the local player submits a word that should trigger the
   * boss battle encounter (currently "GUS"). The caller decides whether
   * to act - this component just reports the submitted word. Only meant
   * to be wired for a normal bot game (not itself a boss battle), same
   * as web - the caller (App.tsx there, MainScreenRoute/GameScreenRoute
   * here) is responsible for that gating. */
  onBossTrigger?: (word: string) => void;
}

export const InteractiveGame: React.FC<InteractiveGameProps> = ({
  botId,
  botDisplayName,
  config,
  onGameEnd,
  onNavigateHome,
  onResign,
  isTutorial = false,
  onTutorialComplete,
  onGameTimeout,
  onBossTrigger
}) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const { gameState, actions, isPlayerTurn, isProcessingMove, isGameActive, isGameFinished, isBotTurn, isBotThinking } =
    useGameState({ config: { maxTurns: 10, allowBotPlayer: true, botId, ...config } });
  const wordState = useWordState(gameState);
  const { handleWordSubmission, handleGameCompletion } = useUnlockSystem();
  const { recordMove, recordGameResult } = usePlayerStats();

  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tutorialProgress = useTutorialProgress(pendingWord, isTutorial ? gameState : null);
  const tutorialCompleteHandledRef = React.useRef(false);
  useEffect(() => {
    if (!isTutorial || !tutorialProgress.isComplete || tutorialCompleteHandledRef.current) return;
    tutorialCompleteHandledRef.current = true;
    markTutorialSeen().catch(err => console.warn('Failed to persist tutorial-seen flag:', err));
    onTutorialComplete?.();
  }, [isTutorial, tutorialProgress.isComplete, onTutorialComplete]);

  const handleSkipTutorial = useCallback(() => {
    markTutorialSeen().catch(err => console.warn('Failed to persist tutorial-seen flag:', err));
    onTutorialComplete?.();
  }, [onTutorialComplete]);

  // Keep the editable word in sync with the engine's current word whenever
  // it's not actively being edited (start of game, after a move, after
  // the bot moves).
  useEffect(() => {
    setPendingWord(wordState.currentWord);
    setPendingMoveAttempt(null);
  }, [wordState.currentWord]);

  // Auto-start the game when the component mounts (skip a welcome
  // screen). No one-shot guard here deliberately: `actions.startGame()`
  // is a safe no-op until the (async) native adapter finishes
  // initializing, so this effect must be allowed to re-fire - once the
  // manager initializes and notifies, `isGameActive`/`isGameFinished`
  // change, this effect re-runs, and this time it actually succeeds.
  // Mirrors apps/web's InteractiveGame.tsx exactly.
  useEffect(() => {
    if (!isGameActive && !isGameFinished) {
      actions.startGame();
    }
  }, [isGameActive, isGameFinished, actions]);

  // Drive the bot's turn automatically.
  useEffect(() => {
    if (isBotTurn && isGameActive && !isBotThinking) {
      actions.makeBotMove();
    }
  }, [isBotTurn, isGameActive, isBotThinking, actions]);

  // Record every one of the local human player's moves into the lifetime
  // player-stats log as they happen (not just at game end), matching
  // web's InteractiveGame.tsx. Depends on the whole `gameState` object
  // rather than `gameState.turnHistory` directly: the engine pushes onto
  // that array in place, so the array reference itself never changes and
  // a dependency on it alone would never re-fire this effect after the
  // first move (same fix documented on web for the analogous word-trail
  // memo).
  const recordedMoveCountRef = React.useRef(0);
  useEffect(() => {
    if (gameState.turnHistory.length <= recordedMoveCountRef.current) return;
    const newEntries = gameState.turnHistory.slice(recordedMoveCountRef.current);
    recordedMoveCountRef.current = gameState.turnHistory.length;

    for (const entry of newEntries) {
      if (entry.playerId === 'human') {
        recordMove(entry).catch(err => console.warn('Failed to record move stats:', err));
      }
    }
  }, [gameState, recordMove]);

  // Report game end to the caller, and check for beat-this-bot unlock
  // achievements (e.g. beating basicBot unlocks easy-bot). Matches web's
  // InteractiveGame.tsx, which checks this at the same gameStatus
  // transition via handleGameCompletion(winner, config?.botId).
  const hasHandledGameEndRef = React.useRef(false);
  useEffect(() => {
    if (!isGameFinished) {
      hasHandledGameEndRef.current = false;
      return;
    }
    if (hasHandledGameEndRef.current) return;
    hasHandledGameEndRef.current = true;

    const human = gameState.players.find(p => p.id === 'human')?.score || 0;
    const bot = gameState.players.find(p => p.id === 'bot')?.score || 0;
    const winner = human > bot ? 'human' : bot > human ? 'bot' : null;

    // Show the win/loss overlay immediately - don't block it on unlock
    // checks or stats recording, matching web's InteractiveGame.tsx.
    onGameEnd?.(winner, { human, bot });
    handleGameCompletion(winner, botId).catch(err => console.warn('Failed to check game completion unlock triggers:', err));

    const gameDurationMs = gameState.gameStartTime && gameState.lastMoveTime
      ? gameState.lastMoveTime - gameState.gameStartTime
      : null;
    recordGameResult({
      playerId: 'human',
      botId,
      won: winner === 'human',
      tied: human === bot,
      turnHistory: gameState.turnHistory,
      totalTurns: gameState.totalMoves,
      finalScore: human,
      gameDurationMs,
      timestamp: Date.now()
    }).catch(err => console.warn('Failed to record game result stats:', err));
  }, [isGameFinished, gameState, onGameEnd, handleGameCompletion, botId, recordGameResult]);

  const letterStates: LetterState[] = useMemo(() => {
    return ALPHABET.map(letter => {
      if (wordState.keyLetters.includes(letter)) return { letter, state: 'key' as const };
      if (wordState.lockedLetters.includes(letter) || wordState.lockedKeyLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      return { letter, state: 'normal' as const };
    });
  }, [wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  const pendingWordHighlights: LetterHighlight[] = useMemo(() => {
    return pendingWord
      .split('')
      .map((letter, index) => {
        if (wordState.lockedKeyLetters.includes(letter)) return { index, type: 'lockedKey' as const };
        if (wordState.keyLetters.includes(letter)) return { index, type: 'key' as const };
        if (wordState.lockedLetters.includes(letter)) return { index, type: 'locked' as const };
        return null;
      })
      .filter((h): h is LetterHighlight => h !== null);
  }, [pendingWord, wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  const handleWordChange = useCallback(
    (newWord: string) => {
      setPendingWord(newWord);
      if (newWord !== wordState.currentWord) {
        setPendingMoveAttempt(actions.attemptMove(newWord));
      } else {
        setPendingMoveAttempt(null);
      }
    },
    [wordState.currentWord, actions]
  );

  const canEdit = isPlayerTurn && !isProcessingMove && isGameActive;

  const handleLetterPress = useCallback(
    (letter: string) => {
      if (!canEdit) return;
      if (pendingWord.length >= MAX_WORD_LENGTH) return;
      triggerHapticFeedback('add');
      handleWordChange(pendingWord + letter);
    },
    [canEdit, pendingWord, handleWordChange]
  );

  const handleRemoveLetter = useCallback(
    (index: number) => {
      if (!canEdit) return;
      triggerHapticFeedback('remove');
      const letters = pendingWord.split('');
      letters.splice(index, 1);
      handleWordChange(letters.join(''));
    },
    [canEdit, pendingWord, handleWordChange]
  );

  const handleActionPress = useCallback(
    (action: string) => {
      if (action === '←') {
        onNavigateHome?.();
        return;
      }
      if (action === '≡') {
        setIsMenuOpen(true);
        return;
      }
      // '?' (help/dictionary lookup) is deferred in this slice - no-op.
      if (action === '?') return;

      if (!canEdit) return;
      if (action === '↻') {
        handleWordChange(wordState.currentWord);
      }
    },
    [canEdit, handleWordChange, wordState.currentWord, onNavigateHome]
  );

  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  const wordUnchanged = pendingWord === wordState.currentWord;

  // The engine increments `currentTurn` (switching to the "next" player)
  // *before* it checks whether the game should actually end, so
  // gameState.currentTurn briefly overshoots by one full round's worth of
  // turns right when the game finishes (e.g. reads as round 11 of a
  // 10-round game) - a real behavior of packages/engine/gamestate.ts
  // (switchToNextPlayer() runs, then the finish check runs), not
  // something to "fix" in the engine itself, since nothing outside this
  // display calculation ever sees or depends on that transient value.
  // web never renders this because it unmounts its entire game board the
  // instant `isGameActive` goes false; this screen keeps the board
  // mounted underneath the win/lose AlertOverlay, so it needs its own
  // clamp instead.
  const currentRound = gameState.players.length > 0
    ? Math.min(Math.ceil(gameState.currentTurn / gameState.players.length), gameState.maxTurns)
    : undefined;

  // "GUS" boss battle: a whole-game countdown (config.gameTimeLimitSeconds)
  // replaces the per-turn time-pressure timer. Runs continuously across
  // both the player's and the bot's turns (unlike a per-turn timer).
  const isBossBattle = typeof config?.gameTimeLimitSeconds === 'number';
  const bossTimeLimitSeconds = isBossBattle ? (config!.gameTimeLimitSeconds as number) : null;
  const [bossTimeRemaining, setBossTimeRemaining] = useState<number | null>(null);
  const bossTimeoutFiredRef = React.useRef(false);

  useEffect(() => {
    if (!isBossBattle || !bossTimeLimitSeconds || !isGameActive) {
      setBossTimeRemaining(null);
      return;
    }

    setBossTimeRemaining(bossTimeLimitSeconds);
    const intervalId = setInterval(() => {
      setBossTimeRemaining(prev => (prev !== null ? Math.max(prev - 1, 0) : null));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isBossBattle, bossTimeLimitSeconds, isGameActive]);

  useEffect(() => {
    if (bossTimeRemaining === 0 && isBossBattle && isGameActive && !bossTimeoutFiredRef.current) {
      bossTimeoutFiredRef.current = true;
      onGameTimeout?.();
    }
  }, [bossTimeRemaining, isBossBattle, isGameActive, onGameTimeout]);

  const handleSubmit = useCallback(() => {
    if (!canEdit) return;

    if (isValidSubmit && pendingMoveAttempt) {
      triggerHapticFeedback('submit');
      const applied = actions.applyMove(pendingMoveAttempt);
      if (applied) {
        // Check for unlock triggers on the local player's own submitted
        // word (e.g. playing "ten" unlocks 10-letter-start/10 rounds).
        // Profanity detection is skipped here since the vanity filter
        // system itself is deferred in this port (always passes `false`).
        // Matches web's InteractiveGame.tsx handleSubmit.
        handleWordSubmission(pendingMoveAttempt.newWord, false).catch(err =>
          console.warn('Failed to check word submission unlock triggers:', err)
        );

        // "GUS" boss trigger: report the submitted word to the caller so
        // it can decide whether to start the boss encounter. Only ever
        // wired by the caller for a normal bot game, not a boss battle
        // itself (see onBossTrigger's own doc comment).
        if (onBossTrigger && pendingMoveAttempt.newWord.toUpperCase() === 'GUS') {
          onBossTrigger(pendingMoveAttempt.newWord);
        }
      }
      return;
    }

    // Invalid word (or unchanged) -> pass turn, matching web's SubmitButton
    // behavior ("Word is invalid - tap to pass turn").
    if (wordUnchanged || !isValidSubmit) {
      actions.passTurn();
    }
  }, [canEdit, isValidSubmit, pendingMoveAttempt, wordUnchanged, actions, handleWordSubmission, onBossTrigger]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Left-aligned overlay near the top of the screen, matching web's
          ScoreBar.css exactly (position: absolute; left: 0; right: 0;
          align-items: flex-start) - not centered, and not a separate
          "rounds left" indicator (web doesn't have one; the "round N"
          row inside ScoreBar itself is the only round indicator). */}
      <View style={styles.header}>
        <ScoreBar
          players={gameState.players}
          botDisplayName={botDisplayName}
          currentRound={currentRound}
        />
        {isBossBattle && bossTimeRemaining !== null && (
          <Text style={[styles.bossTimer, { color: colors.text }]}>{bossTimeRemaining}s</Text>
        )}
      </View>

      <View style={styles.wordArea}>
        <CurrentWord word={pendingWord} highlights={pendingWordHighlights} onLetterPress={canEdit ? handleRemoveLetter : undefined} />
        <View style={styles.submitRow}>
          <SubmitButton
            isValid={isValidSubmit}
            isInvalid={!isValidSubmit && !wordUnchanged}
            onPress={canEdit ? handleSubmit : undefined}
            disabled={!canEdit}
          />
        </View>
        {isBotThinking && (
          <Text style={[styles.status, { color: colors.textSecondary }]}>Bot is thinking...</Text>
        )}
        {isGameFinished && (
          <Text style={[styles.status, { color: colors.text }]}>Game over!</Text>
        )}
      </View>

      <AlphabetGrid
        letterStates={letterStates}
        onLetterPress={handleLetterPress}
        onActionPress={handleActionPress}
        disabled={!canEdit}
      />

      {/* onStartGame intentionally omitted: mid-game the Menu's "bots"
          section is reachable (matching web) but tapping a bot is a no-op
          here rather than switching bots - doing that for real needs
          navigation-level access this screen doesn't have. Small,
          documented gap for this slice. */}
      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isInGame
        onResign={onResign}
        onNavigateHome={onNavigateHome}
      />

      {isTutorial && !tutorialProgress.isComplete && (
        <TutorialOverlay
          currentStepIndex={tutorialProgress.currentStepIndex}
          banner={tutorialProgress.currentStep.banner}
          onSkip={handleSkipTutorial}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between'
  },
  header: {
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingLeft: 12
  },
  bossTimer: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4
  },
  wordArea: {
    alignItems: 'center',
    gap: 12
  },
  submitRow: {
    alignItems: 'center'
  },
  status: {
    fontSize: 14
  }
});
