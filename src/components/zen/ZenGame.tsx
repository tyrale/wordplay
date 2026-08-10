/**
 * Zen Game Component ("vsnobody")
 *
 * A free-play, single-player mode: no bot, no score, no round limit - just
 * the gameboard, the word in play, and the word trail. Standard word rules
 * and every mechanic the player has unlocked/toggled (key letters, locked
 * letters, gravity, drunk, time-pressure, starting-word-length, etc.) still
 * apply exactly as they do in a vs-bot game - it's the same shared game
 * engine (`useGameState`), just with the bot removed and no turn limit.
 *
 * Double-tapping the reset icon (↻) asks to start a brand new word and
 * clear the word trail. A single tap keeps its normal meaning (clear the
 * pending letters back to the current word).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameState, useWordState } from '../../hooks/useGameState';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useWordPathGraph } from '../../hooks/useWordPathGraph';
import { useMechanicsSettings } from '../../contexts/MechanicsSettingsContext';
import { useAlert } from '../ui/AlertProvider';
import { AlphabetGrid, type LetterState } from '../game/AlphabetGrid';
import { WordTrail, type WordMove } from '../game/WordTrail';
import { WordBuilder } from '../game/WordBuilder';
import { type LetterHighlight } from '../game/CurrentWord';
import { ScoreDisplay, type ScoreBreakdown, type ActionState } from '../game/ScoreDisplay';
import { Menu } from '../ui/Menu';
import { AlertOverlay } from '../ui/AlertOverlay';
import { createBrowserAdapter } from '../../adapters/browserAdapter';
import {
  getWordLegalityReason,
  getVariantDefinitionNote,
  isPlayableWord,
  isSeussWord,
  fetchWordDefinition
} from '../../utils/wordHelp';
import { triggerHapticFeedback } from '../../utils/haptics';
import { triggerSoundFeedback } from '../../utils/sound';
import { hasSeenClearHint, markClearHintSeen, hasSeenZenIntro, markZenIntroSeen } from '../../utils/tutorialStorage';
import { ZenIntroOverlay } from './ZenIntroOverlay';
import type { WordDataDependencies, ScoringAction, MoveAttempt } from '../../../packages/engine/interfaces';
import '../game/InteractiveGame.css';

// Number of seconds a player has to take their turn when the time-pressure mechanic is on
const TURN_TIME_LIMIT_SECONDS = 7;
// Two taps on the reset icon within this window count as a double-tap.
const DOUBLE_TAP_RESET_MS = 400;

export interface ZenGameProps {
  onNavigateHome?: () => void;
  onStartGame?: (gameType: 'bot' | 'challenge', botId?: string) => void;
}

export const ZenGame: React.FC<ZenGameProps> = ({ onNavigateHome, onStartGame }) => {
  const { handleWordSubmission, handleWordPathChange, getUnlockedItems } = useUnlockSystem();
  const { recordMove } = usePlayerStats();
  const { recordTransition: recordWordPathTransition, syncToServer: syncWordPathGraph } = useWordPathGraph();
  const { isMechanicOn } = useMechanicsSettings();
  const { showCustomAlert, showAlert } = useAlert();

  // Mechanics: identical gating logic to the vs-bot board, since zen mode
  // honors every mechanic the player has unlocked/toggled - it's just a
  // scoreless, opponent-free, round-free way to play.
  const unlockedMechanics = getUnlockedItems('mechanic');
  const availableStartLengths = [3, 5, 6, 7, 8, 9, 10].filter(len =>
    unlockedMechanics.includes(`${len}-letter-start`) && isMechanicOn(`${len}-letter-start`)
  );
  const startingWordLength = availableStartLengths.length > 0
    ? availableStartLengths[Math.floor(Math.random() * availableStartLengths.length)]
    : undefined;
  const isTimePressureOn = unlockedMechanics.includes('time-pressure') && isMechanicOn('time-pressure');
  const isGravityOn = unlockedMechanics.includes('gravity') && isMechanicOn('gravity');
  const isDrunkOn = unlockedMechanics.includes('drunk') && isMechanicOn('drunk');
  const allowSeussCanonical = unlockedMechanics.includes('seuss-canonical-words');

  // Ninja word trail: unlocked permanently by beating the Ninjabot. No
  // toggle — once unlocked, every move (zen mode is opponent-free, so every
  // move is the local player's own) is shown as dashes in the word trail.
  const ninjaWordTrailUnlocked = unlockedMechanics.includes('ninja-word-trail');

  // Word data (profanity set, legality/definition helpers for the help
  // overlay). Word validity itself is handled by the shared game engine
  // below, so this is only needed for the extras.
  const [wordData, setWordData] = useState<WordDataDependencies | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const adapter = await createBrowserAdapter();
        const data = adapter.getWordData();
        if (data && typeof data.waitForLoad === 'function') {
          await data.waitForLoad();
        }
        if (mounted) setWordData(data);
      } catch (err) {
        console.error('Failed to initialize zen mode word data:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Game state: a single local player, no bot, no turn limit (zen mode never
  // "finishes"). Skips the shared active-game save slot entirely so a zen
  // session never collides with (or overwrites) a real in-progress vs-bot
  // game - each visit to zen mode starts on a fresh word with an empty trail.
  const {
    gameState,
    actions,
    isPlayerTurn,
    isGameActive,
    isProcessingMove,
    lastError,
    clearError
  } = useGameState({
    config: {
      allowBotPlayer: false,
      maxTurns: Number.MAX_SAFE_INTEGER,
      enableKeyLetters: true,
      enableLockedLetters: true,
      startingWordLength,
      allowSeussCanonical
    },
    skipSavedGamePersistence: true
  });

  const wordState = useWordState(gameState);

  // Local UI state
  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // First-time "vsnobody" intro banner
  const [showIntro, setShowIntro] = useState(() => !hasSeenZenIntro());
  const dismissIntro = useCallback(() => {
    markZenIntroSeen();
    setShowIntro(false);
  }, []);

  // Tracks the timestamp of the last tap on the reset icon, to detect a
  // double-tap (see handleActionClick).
  const lastResetTapRef = useRef(0);

  // Bumped on every explicit "new word" reset (see handleConfirmReset). This
  // forces the "sync pending word" effect below to re-run even when the
  // freshly-picked random word happens to be IDENTICAL to the word that was
  // in play before the reset (a real, if infrequent, possibility) - relying
  // on wordState.currentWord alone would see "no change" in that case and
  // never fire, leaving pendingWord stuck at whatever it was set to
  // immediately before the reset.
  const [resetGeneration, setResetGeneration] = useState(0);

  // Initialize/sync pending word with the current word - on mount, after
  // every submitted move, and after an explicit reset (via resetGeneration).
  useEffect(() => {
    setPendingWord(wordState.currentWord);
  }, [wordState.currentWord, resetGeneration]);

  // Auto-start the game when the component mounts
  const handleStartGameInternal = useCallback(async () => {
    await actions.startGame();
  }, [actions]);

  useEffect(() => {
    if (!isGameActive) {
      handleStartGameInternal();
    }
  }, [isGameActive, handleStartGameInternal]);

  // Time-pressure countdown: resets to 7 seconds each time the player's turn
  // starts, and clears when it's no longer the player's turn. Auto-passing
  // simply moves the "turn" forward in zen mode - there's no round limit or
  // opponent, so nothing is lost besides the in-progress edit.
  useEffect(() => {
    if (!isTimePressureOn || !isPlayerTurn || !isGameActive) {
      setTurnTimeRemaining(null);
      return;
    }

    setTurnTimeRemaining(TURN_TIME_LIMIT_SECONDS);

    const intervalId = setInterval(() => {
      setTurnTimeRemaining(prev => (prev !== null ? Math.max(prev - 1, 0) : null));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isTimePressureOn, isPlayerTurn, isGameActive]);

  useEffect(() => {
    if (turnTimeRemaining === 0 && isTimePressureOn && isPlayerTurn && isGameActive) {
      actions.passTurn();
      setPendingWord(wordState.currentWord);
      setPendingMoveAttempt(null);
      setShowValidationError(false);
      setTurnTimeRemaining(null);
    }
  }, [turnTimeRemaining, isTimePressureOn, isPlayerTurn, isGameActive, actions, wordState.currentWord]);

  // Letter grid state (key letters / locked letters, same as vs-bot)
  const letterStates: LetterState[] = useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return alphabet.map(letter => {
      if (wordState.keyLetters.includes(letter)) {
        return { letter, state: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter) || wordState.lockedKeyLetters.includes(letter)) {
        return { letter, state: 'locked' as const };
      }
      return { letter, state: 'normal' as const };
    });
  }, [wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  const pendingWordHighlights: LetterHighlight[] = useMemo(() => {
    return pendingWord.split('').map((letter, index) => {
      if (wordState.lockedKeyLetters.includes(letter)) {
        return { index, type: 'lockedKey' as const };
      }
      if (wordState.keyLetters.includes(letter)) {
        return { index, type: 'key' as const };
      }
      if (wordState.lockedLetters.includes(letter)) {
        return { index, type: 'locked' as const };
      }
      return null;
    }).filter((highlight): highlight is LetterHighlight => highlight !== null);
  }, [pendingWord, wordState.keyLetters, wordState.lockedLetters, wordState.lockedKeyLetters]);

  const actionState: ActionState = useMemo(() => {
    if (!pendingMoveAttempt?.scoringResult) {
      return { add: false, remove: false, move: false };
    }
    const actionsList: ScoringAction[] = pendingMoveAttempt.scoringResult.actions;
    return {
      add: actionsList.some(action => action.type === 'add'),
      remove: actionsList.some(action => action.type === 'remove'),
      move: actionsList.some(action => action.type === 'rearrange')
    };
  }, [pendingMoveAttempt]);

  // No points in zen mode - always zeroed. ScoreDisplay is still used (it's
  // also the submit button), just with isChallengeMode to hide the numbers.
  const scoreBreakdown: ScoreBreakdown = useMemo(() => ({ base: 0, keyBonus: 0, total: 0 }), []);

  // Word trail - no scores shown, just the sequence of words played since
  // the last reset. Depends on the whole `gameState` object rather than
  // `gameState.turnHistory` directly: the engine pushes onto that array in
  // place (turnHistory.push(...)) instead of replacing it, so the array
  // reference never changes and a dependency on it alone would never
  // re-trigger this memo after the first move. `gameState` itself is always
  // a fresh object per update (see gamestate.ts's getState()), so it's the
  // reliable dependency - same fix already applied in InteractiveGame's
  // analogous wordTrailMoves memo (see its "Use full gameState instead of
  // just turnHistory" comment).
  const wordTrailMoves: WordMove[] = useMemo(() => {
    return gameState.turnHistory.map(turn => ({
      word: turn.newWord,
      score: 0,
      turnNumber: turn.turnNumber,
      keyLetters: turn.scoringBreakdown.keyLettersUsed || [],
      maskWord: ninjaWordTrailUnlocked
    }));
  }, [gameState, ninjaWordTrailUnlocked]);

  // Event handlers
  const handleHelp = useCallback(async () => {
    const word = pendingWord.trim().toUpperCase();
    if (!word) return;

    const grinchBotUnlocked = getUnlockedItems('bot').includes('grinch-bot');
    if (grinchBotUnlocked && isSeussWord(word, wordData)) {
      showCustomAlert([word], {
        meta: (
          <div className="alert-overlay__meta-definition">
            This is a Dr. Seuss word and it's fantastic.
          </div>
        )
      });
      return;
    }

    const definition = await fetchWordDefinition(word);
    const reason = getWordLegalityReason(word, wordData);
    const variantNote = getVariantDefinitionNote(word, wordData, definition);
    const isInvalid = !isPlayableWord(word, wordData);

    showCustomAlert([word], {
      meta: (
        <>
          <div className={isInvalid ? 'alert-overlay__meta-reason--invalid' : ''}>
            {reason}
          </div>
          {variantNote && (
            <div className="alert-overlay__meta-variant-note">{variantNote}</div>
          )}
          <div className="alert-overlay__meta-definition">
            {definition || 'No definition available'}
          </div>
        </>
      )
    });
  }, [pendingWord, wordData, showCustomAlert, getUnlockedItems]);

  const handleSettings = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  // Confirmed "new word" reset: fresh word, empty trail. Uses the same
  // config the game was created with (resetGame() re-applies it internally),
  // so mechanics/starting-word-length stay consistent with the current toggle
  // state. pendingWord itself isn't set here directly - bumping
  // resetGeneration guarantees the sync effect above picks up the fresh
  // word (see its comment for why a direct `setPendingWord('')` here isn't
  // reliable).
  const handleConfirmReset = useCallback(() => {
    actions.resetGame();
    setPendingMoveAttempt(null);
    setShowValidationError(false);
    setIsResetConfirmOpen(false);
    setResetGeneration(g => g + 1);
  }, [actions]);

  const handleActionClick = useCallback((action: string) => {
    if (action === '≡') {
      handleSettings();
      return;
    }

    if (action === '←') {
      onNavigateHome?.();
      return;
    }

    if (action === '?') { // Help / dictionary lookup - always reachable, even off-turn
      handleHelp();
      return;
    }

    if (!isPlayerTurn || isProcessingMove) return;

    switch (action) {
      case '↻': {
        // Double-tap detection: two taps within the window ask for a full
        // reset (new word + cleared trail). A single tap keeps its normal
        // meaning - clear the pending edit back to the current word.
        const now = Date.now();
        if (now - lastResetTapRef.current < DOUBLE_TAP_RESET_MS) {
          lastResetTapRef.current = 0;
          setIsResetConfirmOpen(true);
        } else {
          lastResetTapRef.current = now;
          setPendingWord(wordState.currentWord);
          setPendingMoveAttempt(null);
        }
        break;
      }
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, handleHelp, handleSettings, onNavigateHome]);

  const handleWordChange = useCallback((newWord: string) => {
    if (!isPlayerTurn || isProcessingMove) {
      return;
    }

    setPendingWord(newWord);
    setShowValidationError(false);

    if (newWord !== wordState.currentWord) {
      const attempt = actions.attemptMove(newWord);
      setPendingMoveAttempt(attempt);
    } else {
      setPendingMoveAttempt(null);
    }
  }, [isPlayerTurn, isProcessingMove, wordState.currentWord, actions]);

  const handleLetterClick = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;

    if (pendingWord.length < 10) {
      triggerHapticFeedback('add');
      triggerSoundFeedback('add');
      handleWordChange(pendingWord + letter);
    }
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const handleLetterDragStart = useCallback((letter: string) => {
    if (!isPlayerTurn || isProcessingMove) return;
    setDraggedLetter(letter);
  }, [isPlayerTurn, isProcessingMove]);

  const handleLetterDragEnd = useCallback(() => {
    setDraggedLetter(null);
  }, []);

  const handleWordBuilderMouseUp = useCallback((_e: React.MouseEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      triggerHapticFeedback('add');
      triggerSoundFeedback('add');
      handleWordChange(pendingWord + draggedLetter);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleWordBuilderTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (draggedLetter && pendingWord.length < 10) {
      triggerHapticFeedback('add');
      triggerSoundFeedback('add');
      handleWordChange(pendingWord + draggedLetter);
    }
    setDraggedLetter(null);
  }, [draggedLetter, pendingWord, handleWordChange]);

  const handleLetterRemove = useCallback((info: { letter: string; index: number }) => {
    if (!isPlayerTurn || isProcessingMove) {
      return;
    }

    if (info.index < 0 || info.index >= pendingWord.length) {
      return;
    }

    const letters = pendingWord.split('');
    letters.splice(info.index, 1);
    handleWordChange(letters.join(''));
  }, [isPlayerTurn, isProcessingMove, pendingWord, handleWordChange]);

  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  const showInvalidX = !isValidSubmit;

  const handleSubmit = useCallback(async () => {
    if (!isPlayerTurn || isProcessingMove) return;

    const wordUnchanged = pendingWord === wordState.currentWord;
    if (!isValidSubmit && wordUnchanged && !showValidationError) {
      if (!hasSeenClearHint()) {
        markClearHintSeen();
        showAlert('hints', 'clearWord');
      }
      handleWordChange('');
      return;
    }

    if (!isValidSubmit) {
      if (!showValidationError) {
        setShowValidationError(true);
        return;
      } else {
        actions.passTurn();
        setPendingWord(wordState.currentWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
        return;
      }
    }

    if (pendingMoveAttempt?.canApply) {
      const success = actions.applyMove(pendingMoveAttempt);
      if (success) {
        triggerHapticFeedback('submit');
        triggerSoundFeedback('submit');

        const newWord = pendingMoveAttempt.newWord;
        const previousWord = wordState.currentWord;
        const isProfane = !!wordData?.profanityWords.has(newWord.toUpperCase());
        await handleWordSubmission(newWord, isProfane);

        recordWordPathTransition(previousWord, newWord)
          .then(() => syncWordPathGraph())
          .catch(err => console.warn('Failed to record/sync zen word path transition:', err));

        if (pendingMoveAttempt.scoringResult) {
          recordMove({
            turnNumber: gameState.turnHistory.length + 1,
            playerId: 'human',
            previousWord,
            newWord,
            score: 0,
            keyLettersUsed: pendingMoveAttempt.scoringResult.keyLettersUsed,
            scoringBreakdown: pendingMoveAttempt.scoringResult,
            timestamp: Date.now()
          }).catch(err => console.warn('Failed to record zen move stats:', err));
        }

        // Word-sequence unlocks (e.g. STINK → STANK → STUNK), same as vs-bot.
        const wordPath = [wordState.currentWord, ...gameState.turnHistory.map(t => t.newWord), newWord];
        if (wordPath.length >= 3) {
          handleWordPathChange(wordPath).catch(err =>
            console.warn('Failed to check zen word sequence unlock triggers:', err)
          );
        }

        setPendingWord(newWord);
        setPendingMoveAttempt(null);
        setShowValidationError(false);
      }
    }
  }, [isPlayerTurn, isProcessingMove, pendingWord, pendingMoveAttempt, actions, wordState.currentWord, showValidationError, handleWordSubmission, wordData, handleWordChange, showAlert, recordWordPathTransition, syncWordPathGraph, recordMove, handleWordPathChange, gameState.turnHistory, isValidSubmit]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <div
      className={'interactive-game' + (isDrunkOn ? ' interactive-game--drunk' : '')}
    >
      {/* Error display */}
      {lastError && (
        <div className="interactive-game__error" role="alert">
          <span>{lastError}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Main game area */}
      {isGameActive && (
        <div className="interactive-game__board">
          <div className="interactive-game__centered-container">
            {/* Submit anchor - the absolute center point */}
            <div className="interactive-game__submit-anchor">
              <ScoreDisplay
                score={scoreBreakdown}
                actions={actionState}
                isValid={!showInvalidX}
                isPassConfirming={false}
                passReason={null}
                onClick={!isProcessingMove && isPlayerTurn ? handleSubmit : undefined}
                className="interactive-game__score"
                isPassMode={false}
                validationError={pendingMoveAttempt?.validationResult?.userMessage || null}
                showValidationError={showValidationError}
                isChallengeMode={true}
                timerSeconds={isTimePressureOn && isPlayerTurn ? turnTimeRemaining : null}
              />
            </div>

            {/* Word trail positioned above submit anchor */}
            <div className="interactive-game__word-trail-positioned">
              <WordTrail
                moves={wordTrailMoves}
                showScores={false}
                showTurnNumbers={true}
                maxVisible={5}
              />
            </div>

            {/* Word builder positioned below submit anchor */}
            <div className="interactive-game__word-builder-positioned">
              <div
                onMouseUp={handleWordBuilderMouseUp}
                onTouchEnd={handleWordBuilderTouchEnd}
              >
                <WordBuilder
                  currentWord={pendingWord}
                  wordHighlights={pendingWordHighlights}
                  onWordChange={handleWordChange}
                  onLetterClick={handleLetterRemove}
                  disabled={isProcessingMove || !isPlayerTurn}
                  maxLength={10}
                  minLength={3}
                  isEditing={true}
                />
              </div>
            </div>

            {/* Alphabet grid positioned below word builder */}
            <div className="interactive-game__grid-positioned">
              <AlphabetGrid
                letterStates={letterStates}
                onLetterClick={handleLetterClick}
                onActionClick={handleActionClick}
                onLetterDragStart={handleLetterDragStart}
                onLetterDragEnd={handleLetterDragEnd}
                disabled={!isPlayerTurn || isProcessingMove}
                enableDrag={true}
                gravityEnabled={isGravityOn}
              />
            </div>
          </div>
        </div>
      )}

      {showIntro && <ZenIntroOverlay onDismiss={dismissIntro} />}

      {/* Menu - no "resign" (there's no opponent to resign against) */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onDebugOpen={() => {}}
        onNavigateHome={onNavigateHome}
        onStartGame={(gameType, botId) => {
          if (gameType === 'bot' && botId) {
            onStartGame?.(gameType, botId);
          } else if (gameType === 'challenge') {
            onStartGame?.(gameType);
          }
        }}
        isInGame={false}
        currentGameMode="zen"
      />

      {/* Reset confirmation - double-tapping ↻ asks before wiping the trail */}
      <AlertOverlay
        isVisible={isResetConfirmOpen}
        lines={['NEW', 'WORD?']}
        meta={<div className="alert-overlay__meta-definition">This clears your word trail.</div>}
        actions={[{ label: 'yes', onClick: handleConfirmReset }]}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
