/**
 * Native InteractiveGame screen - Phase 2's "smallest complete gameplay
 * loop" (see docs/project/REACT_NATIVE_PORT_PLAN.md). Ports the core
 * interaction logic of apps/web's `components/game/InteractiveGame.tsx`
 * (word-builder state machine: pendingWord -> attemptMove -> submit/pass).
 * The first-time tutorial, the "GUS" boss battle's whole-game countdown,
 * and (Phase 4) vs-human multiplayer are all wired via the same board -
 * see `isTutorial`/`onGameTimeout`/`onBossTrigger` and
 * `externalManager`/`localPlayerId`/`currentGameMode` below. The vanity
 * (bad word) filter is still not part of this port.
 *
 * Multiplayer note: `externalManager`/`localPlayerId` let a caller
 * (MultiplayerGame.tsx) supply an already-constructed
 * `RemoteGameStateManager` instead of the local bot-game manager - the
 * board renders exactly as it does for a bot game, just driven by that
 * manager's state/actions instead (see `useGameState.ts`, which already
 * had this plumbing from Phase 2 even though nothing used it until now).
 * Every place this file otherwise hardcoded the literal ids `'human'`/
 * `'bot'` (only ever true for vs-bot games) now resolves via
 * `localPlayerId ?? 'human'` and "whichever other player" instead,
 * matching web's InteractiveGame.tsx exactly - ported as a real
 * generalization, not multiplayer-specific special-casing.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GameConfig, MoveAttempt, IGameStateManager } from '@wordplay/engine/interfaces';
import { useGameState, useWordState } from '../hooks/useGameState';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { AlphabetGrid } from '../components/AlphabetGrid';
import type { LetterState } from '../components/AlphabetGrid';
import { CurrentWord } from '../components/CurrentWord';
import type { LetterHighlight } from '../components/CurrentWord';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { ScoreBar } from '../components/ScoreBar';
import { WordTrail } from '../components/WordTrail';
import type { WordMove } from '../components/WordTrail';
import { Menu } from '../components/Menu';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { getBotDisplayName } from '@wordplay/engine/botRegistry';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { useTutorialProgress } from '../hooks/useTutorialProgress';
import { useWordDropZone } from '../hooks/useWordDropZone';
import { useDictionaryData } from '../hooks/useDictionaryData';
import { useAlert } from '../providers/AlertProvider';
import {
  getWordLegalityReason,
  getVariantDefinitionNote,
  isPlayableWord,
  isSeussWord,
  isSeussInventedWord,
  fetchWordDefinition
} from '../utils/wordHelp';
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
  /**
   * Use an already-constructed manager instead of the local bot-game
   * manager - e.g. a `RemoteGameStateManager` for vs-human multiplayer
   * (see MultiplayerGame.tsx). When provided, the board renders exactly
   * as it does for a bot game, just driven by this manager's state/
   * actions instead.
   */
  externalManager?: IGameStateManager;
  /** The authenticated player id to treat as "the local player" when
   * using `externalManager` - every place this component would
   * otherwise assume the literal id `'human'` resolves through this
   * instead. */
  localPlayerId?: string;
  /** Distinguishes a vs-human multiplayer game from a plain bot game for
   * the few places that need it (currently just player-stats/game-end
   * id resolution) - mirrors web's `currentGameMode` prop, trimmed to
   * only the multiplayer case since tutorial/boss are already covered by
   * their own dedicated props here. */
  currentGameMode?: 'bot' | 'multiplayer';
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
  onBossTrigger,
  externalManager,
  localPlayerId,
  currentGameMode = 'bot'
}) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const { gameState, actions, isPlayerTurn, isProcessingMove, isGameActive, isGameFinished, isBotTurn, isBotThinking } =
    useGameState({
      config: { maxTurns: 10, allowBotPlayer: true, botId, ...config },
      externalManager,
      localPlayerId,
      skipSavedGamePersistence: !!externalManager
    });
  const wordState = useWordState(gameState);
  const { handleWordSubmission, handleGameCompletion, getUnlockedItems } = useUnlockSystem();
  const { recordMove, recordGameResult } = usePlayerStats();
  const { wordData } = useDictionaryData();
  const { showCustomAlert } = useAlert();

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

    const localId = localPlayerId ?? 'human';
    for (const entry of newEntries) {
      if (entry.playerId === localId) {
        recordMove(entry).catch(err => console.warn('Failed to record move stats:', err));
      }
    }
  }, [gameState, recordMove, localPlayerId]);

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

    // `localId`/`opponentId` resolve generically instead of assuming the
    // literal ids 'human'/'bot' - true for every vs-bot game, but a real
    // Supabase user id in multiplayer. Matches web's InteractiveGame.tsx
    // exactly (ported as a real generalization, not new behavior).
    const localId = localPlayerId ?? 'human';
    const opponentId = localPlayerId ? gameState.players.find(p => p.id !== localId)?.id : 'bot';
    const human = gameState.players.find(p => p.id === localId)?.score || 0;
    const bot = gameState.players.find(p => p.id === opponentId)?.score || 0;
    const winner = gameState.winner?.id || null;

    // Show the win/loss overlay immediately - don't block it on unlock
    // checks or stats recording, matching web's InteractiveGame.tsx.
    onGameEnd?.(winner, { human, bot });
    // `botId` is only ever set for a real vs-bot game (undefined for
    // multiplayer), and handleGameCompletion's own achievement check is a
    // no-op without one - safe to call unconditionally here.
    handleGameCompletion(winner, botId).catch(err => console.warn('Failed to check game completion unlock triggers:', err));

    const gameDurationMs = gameState.gameStartTime && gameState.lastMoveTime
      ? gameState.lastMoveTime - gameState.gameStartTime
      : null;
    recordGameResult({
      playerId: localId,
      botId,
      won: winner === localId,
      tied: human === bot,
      turnHistory: gameState.turnHistory,
      totalTurns: gameState.totalMoves,
      finalScore: human,
      gameDurationMs,
      timestamp: Date.now()
    }).catch(err => console.warn('Failed to record game result stats:', err));
  }, [isGameFinished, gameState, onGameEnd, handleGameCompletion, botId, recordGameResult, localPlayerId]);

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

  // Word trail with move details - matches web's InteractiveGame.tsx
  // exactly, generalized via localPlayerId the same way Phase 4's other
  // fixes were. Ninjabot's dash-masking gimmick is deliberately not
  // wired here - see WordTrail.tsx's doc comment.
  const wordTrailMoves: WordMove[] = useMemo(() => {
    const localId = localPlayerId ?? 'human';
    return gameState.turnHistory.map(turn => ({
      word: turn.newWord,
      score: turn.score,
      player: turn.playerId,
      opponentName: turn.playerId === 'bot' && botId ? getBotDisplayName(botId) : undefined,
      turnNumber: turn.turnNumber,
      keyLetters: turn.scoringBreakdown.keyLettersUsed || [],
      scoreBreakdown: turn.scoringBreakdown.breakdown
    }));
  }, [gameState, botId, localPlayerId]);

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

  // Dragging a letter tile from the grid and releasing it over the word
  // area appends it - the same action as tapping it, just via web's
  // other supported gesture (see AlphabetGrid.tsx/GridCell.tsx/
  // CurrentWord.tsx's doc comments for how the drag itself works).
  const { wordRef, checkDrop } = useWordDropZone();
  const handleLetterDragRelease = useCallback(
    (letter: string, pageX: number, pageY: number) => {
      checkDrop(pageX, pageY, () => handleLetterPress(letter));
    },
    [checkDrop, handleLetterPress]
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

  // Dictionary/help lookup ("?"): shows the currently-typed word's
  // legality reason and a fetched definition. Matches web's
  // InteractiveGame.tsx handleHelp exactly, including the Grinchbot/Seuss
  // special-casing - see docs/project/REACT_NATIVE_PORT_PLAN.md's "Phase
  // 3.6" section for why this was a real, previously-unscheduled gap.
  const handleHelp = useCallback(async () => {
    const word = pendingWord.trim().toUpperCase();
    if (!word) return;

    // If the player has unlocked the Grinchbot and the word is a Dr.
    // Seuss word, show a special Seuss message instead of a dictionary
    // definition.
    const grinchBotUnlocked = getUnlockedItems('bot').includes('grinch-bot');
    if (grinchBotUnlocked && isSeussWord(word, wordData)) {
      if (botId === 'grinch-bot' && isSeussInventedWord(word, wordData)) {
        showCustomAlert(['DONT', 'QUESTION', 'ME!'], {
          meta: <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center' }}>I'm the Grinch I can say what i want.</Text>
        });
      } else {
        showCustomAlert([word], {
          meta: <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center' }}>This is a Dr. Seuss word and it's fantastic.</Text>
        });
      }
      return;
    }

    const definition = await fetchWordDefinition(word);
    const reason = getWordLegalityReason(word, wordData);
    const variantNote = getVariantDefinitionNote(word, wordData, definition);
    const isInvalid = !isPlayableWord(word, wordData);

    showCustomAlert([word], {
      meta: (
        <>
          <Text style={{ color: isInvalid ? '#DC2626' : colors.text, fontSize: 14, textAlign: 'center', fontWeight: '700' }}>
            {reason}
          </Text>
          {variantNote && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 }}>{variantNote}</Text>
          )}
          <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
            {definition || 'No definition available'}
          </Text>
        </>
      )
    });
  }, [pendingWord, wordData, showCustomAlert, getUnlockedItems, botId, colors]);

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
      if (action === '?') {
        handleHelp();
        return;
      }

      if (!canEdit) return;
      if (action === '↻') {
        handleWordChange(wordState.currentWord);
      }
    },
    [canEdit, handleWordChange, wordState.currentWord, onNavigateHome, handleHelp]
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

    // Invalid word (or unchanged) -> pass turn, matching web's ScoreDisplay
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
          isMultiplayer={currentGameMode === 'multiplayer'}
          localPlayerId={localPlayerId}
        />
        {isBossBattle && bossTimeRemaining !== null && (
          <Text style={[styles.bossTimer, { color: colors.text }]}>{bossTimeRemaining}s</Text>
        )}
      </View>

      {/* Matches web's InteractiveGame.css exactly: the submit row (not
          the word) is the actual fixed center point of the whole board -
          `board` flex-centers a single zero-content-height anchor point,
          then the word and grid are positioned as absolute overlays a
          fixed gap above/below THAT point (`bottom: 100%`/`top: 100%`
          relative to the anchor, same percentage-positioning semantics
          RN and CSS share) - not "the word centered in whatever space is
          left above the grid", which is a different, smaller, and
          visually off-center region once the grid's own height is
          accounted for. */}
      <View style={styles.board}>
        <View style={styles.submitAnchor}>
          <ScoreDisplay
            moveAttempt={pendingMoveAttempt}
            isValid={isValidSubmit}
            onPress={canEdit ? handleSubmit : undefined}
            disabled={!canEdit}
          />

          <View style={styles.wordPositioned}>
            {wordTrailMoves.length > 0 && (
              <View style={styles.wordTrail}>
                <WordTrail moves={wordTrailMoves} showScores />
              </View>
            )}
            <CurrentWord
              ref={wordRef}
              word={pendingWord}
              highlights={pendingWordHighlights}
              onLetterPress={canEdit ? handleRemoveLetter : undefined}
              onWordChange={canEdit ? handleWordChange : undefined}
            />
          </View>

          <View style={styles.gridPositioned}>
            <AlphabetGrid
              letterStates={letterStates}
              onLetterPress={handleLetterPress}
              onActionPress={handleActionPress}
              onLetterDragRelease={handleLetterDragRelease}
              disabled={!canEdit}
            />
            {isBotThinking && (
              <Text style={[styles.status, { color: colors.textSecondary }]}>Bot is thinking...</Text>
            )}
            {isGameFinished && (
              <Text style={[styles.status, { color: colors.text }]}>Game over!</Text>
            )}
          </View>
        </View>
      </View>

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
    flex: 1
  },
  header: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'flex-start',
    zIndex: 1
  },
  bossTimer: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4
  },
  // Fills all remaining space below the (absolutely-positioned) header
  // and flex-centers its one child (submitAnchor) - this is what makes
  // the anchor the true center point of the whole board.
  board: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Explicit full width (matching web's centered-container's own
  // `width: 100%`) even though its *height* stays collapsed to just the
  // submit row's own content - `wordPositioned`/`gridPositioned` below
  // are `left: 0; right: 0` overlays relative to THIS view's bounds, so
  // it has to actually span the full screen width for them to too, not
  // auto-size down to the (much narrower) ScoreDisplay row itself.
  submitAnchor: {
    width: '100%',
    alignItems: 'center'
  },
  // `bottom: '100%'` = the word's bottom edge sits at the anchor's OWN
  // top edge (100% of the anchor's height, measured up from its
  // bottom) - then marginBottom adds the fixed gap on top of that. Same
  // percentage-positioning semantics as web's `bottom: calc(100% + 20px)`.
  wordPositioned: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  // `wordPositioned`'s own `alignItems: 'center'` shrink-wraps its
  // children to their content by default - without overriding that
  // here, WordTrail's internal `width: '100%'` (needed so its score can
  // float to the true right edge instead of landing right next to/on
  // top of the word) would just be 100% of a box barely wider than the
  // word itself, doing nothing.
  wordTrail: {
    alignSelf: 'stretch',
    marginBottom: 20
  },
  gridPositioned: {
    position: 'absolute',
    top: '100%',
    marginTop: 20,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  status: {
    fontSize: 14,
    marginTop: 8
  }
});
