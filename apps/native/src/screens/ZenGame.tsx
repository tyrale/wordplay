/**
 * Native Zen Game screen ("vsnobody") - a significantly scoped-down port
 * of apps/web's `components/zen/ZenGame.tsx`. That component is ~600
 * lines covering mechanics-gated starting-word-length/time-pressure/
 * gravity/drunk, a double-tap-to-reset-with-a-new-word gesture, player
 * stats recording, word-path graph syncing, and a dictionary help
 * lookup - none of which exist in this native port yet (several are
 * gaps shared with InteractiveGame.tsx, not zen-specific).
 *
 * This slice ports the actual core of "zen mode": free play, no bot, no
 * score, no round limit, using the exact same shared game engine
 * (`useGameState`) and UI components as the vs-bot screen. Unlock
 * checking on submitted words is wired (cheap, and consistent with the
 * rest of this port). Deliberately deferred, not silently dropped (each
 * needs infrastructure this port doesn't have yet): mechanics gating,
 * player stats, word-path graph syncing, dictionary help, and the
 * double-tap "start a brand new word" gesture (reset here always just
 * clears the pending edit, matching a *single* tap's meaning on web).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MoveAttempt } from '@wordplay/engine/interfaces';
import { useGameState, useWordState } from '../hooks/useGameState';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { AlphabetGrid } from '../components/AlphabetGrid';
import type { LetterState } from '../components/AlphabetGrid';
import { CurrentWord } from '../components/CurrentWord';
import type { LetterHighlight } from '../components/CurrentWord';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { WordTrail } from '../components/WordTrail';
import type { WordMove } from '../components/WordTrail';
import { Menu } from '../components/Menu';
import { useWordDropZone } from '../hooks/useWordDropZone';
import { triggerHapticFeedback } from '../utils/haptics';

const MAX_WORD_LENGTH = 10;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface ZenGameProps {
  onNavigateHome?: () => void;
}

export const ZenGame: React.FC<ZenGameProps> = ({ onNavigateHome }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const { handleWordSubmission } = useUnlockSystem();

  // No bot, no round limit, and skip the shared active-game save slot
  // entirely (matching web) so a zen session never collides with a real
  // in-progress vs-bot game.
  const { gameState, actions, isPlayerTurn, isProcessingMove, isGameActive } = useGameState({
    config: { allowBotPlayer: false, maxTurns: Number.MAX_SAFE_INTEGER, enableKeyLetters: true, enableLockedLetters: true },
    skipSavedGamePersistence: true
  });
  const wordState = useWordState(gameState);

  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setPendingWord(wordState.currentWord);
    setPendingMoveAttempt(null);
  }, [wordState.currentWord]);

  // Auto-start on mount (no bot to wait on, no win/lose to reach).
  useEffect(() => {
    if (!isGameActive) {
      actions.startGame();
    }
  }, [isGameActive, actions]);

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

  // Word trail - matches web's ZenGame.tsx exactly: no scores (zen mode
  // is scoreless by design), key letters still highlighted. Ninjabot's
  // permanent dash-masking unlock (`ninja-word-trail`) is deliberately
  // not wired here - see WordTrail.tsx's doc comment.
  const wordTrailMoves: WordMove[] = useMemo(() => {
    return gameState.turnHistory.map(turn => ({
      word: turn.newWord,
      score: 0,
      turnNumber: turn.turnNumber,
      keyLetters: turn.scoringBreakdown.keyLettersUsed || []
    }));
  }, [gameState]);

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
        // A single tap always clears the pending edit here - web's
        // double-tap-for-a-brand-new-word gesture is deferred.
        handleWordChange(wordState.currentWord);
      }
    },
    [canEdit, handleWordChange, wordState.currentWord, onNavigateHome]
  );

  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  const wordUnchanged = pendingWord === wordState.currentWord;

  const handleSubmit = useCallback(() => {
    if (!canEdit) return;

    if (isValidSubmit && pendingMoveAttempt) {
      triggerHapticFeedback('submit');
      const applied = actions.applyMove(pendingMoveAttempt);
      if (applied) {
        handleWordSubmission(pendingMoveAttempt.newWord, false).catch(err =>
          console.warn('Failed to check zen word submission unlock triggers:', err)
        );
      }
      return;
    }

    // Invalid word (or unchanged) -> pass turn, matching web's ScoreDisplay
    // behavior ("Word is invalid - tap to pass turn").
    if (wordUnchanged || !isValidSubmit) {
      actions.passTurn();
    }
  }, [canEdit, isValidSubmit, pendingMoveAttempt, wordUnchanged, actions, handleWordSubmission]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* See InteractiveGame.tsx's identical comment: the submit row is
          the actual fixed center point of the board, with the word
          trail/current word positioned a fixed gap above it and the
          grid a fixed gap below it - not "the word centered above the
          grid", which visually reads as off-center once the grid's own
          height is accounted for. */}
      <View style={styles.board}>
        <View style={styles.submitAnchor}>
          <ScoreDisplay
            moveAttempt={pendingMoveAttempt}
            isValid={isValidSubmit}
            onPress={canEdit ? handleSubmit : undefined}
            disabled={!canEdit}
            isChallengeMode
          />

          <View style={styles.wordPositioned}>
            {wordTrailMoves.length > 0 && (
              <View style={styles.wordTrail}>
                <WordTrail moves={wordTrailMoves} />
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
          </View>
        </View>
      </View>

      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onNavigateHome={onNavigateHome} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  board: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // See InteractiveGame.tsx's identical comment: explicit full width so
  // the absolutely-positioned word/grid overlays below actually span the
  // full screen instead of the (much narrower) ScoreDisplay row itself.
  submitAnchor: {
    width: '100%',
    alignItems: 'center'
  },
  wordPositioned: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  gridPositioned: {
    position: 'absolute',
    top: '100%',
    marginTop: 20,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  // See InteractiveGame.tsx's identical comment: overrides `wordPositioned`'s
  // shrink-wrapping `alignItems: 'center'` so WordTrail actually gets the
  // full row width its internal layout needs.
  wordTrail: {
    alignSelf: 'stretch',
    marginBottom: 20
  }
});
