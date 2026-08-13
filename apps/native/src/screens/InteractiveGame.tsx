/**
 * Native InteractiveGame screen - Phase 2's "smallest complete gameplay
 * loop" (see docs/project/REACT_NATIVE_PORT_PLAN.md). Ports the core
 * interaction logic of apps/web's `components/game/InteractiveGame.tsx`
 * (word-builder state machine: pendingWord -> attemptMove -> submit/pass),
 * trimmed of everything not needed for a bare bot game: no challenge
 * mode, tutorial overlay, boss battles, multiplayer, or vanity filter -
 * those are follow-up slices, not part of this one.
 *
 * Interaction model differs from web's drag-and-drop (see AlphabetGrid.tsx
 * and CurrentWord.tsx doc comments): tap a grid letter to append it, tap
 * a letter in the current word to remove it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import type { MoveAttempt } from '@wordplay/engine/interfaces';
import { useGameState, useWordState, useGameStats } from '../hooks/useGameState';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { AlphabetGrid } from '../components/AlphabetGrid';
import type { LetterState } from '../components/AlphabetGrid';
import { CurrentWord } from '../components/CurrentWord';
import type { LetterHighlight } from '../components/CurrentWord';
import { SubmitButton } from '../components/SubmitButton';
import { ScoreBar } from '../components/ScoreBar';
import { triggerHapticFeedback } from '../utils/haptics';

const MAX_WORD_LENGTH = 10;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface InteractiveGameProps {
  /** Bot registry id (see @wordplay/engine/botRegistry) determining the
   * opponent's move-generation strategy - not just its display name. */
  botId?: string;
  botDisplayName?: string;
  onGameEnd?: (winner: string | null, finalScores: { human: number; bot: number }) => void;
  onExit?: () => void;
}

export const InteractiveGame: React.FC<InteractiveGameProps> = ({ botId, botDisplayName, onGameEnd, onExit }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const { gameState, actions, isPlayerTurn, isProcessingMove, isGameActive, isGameFinished, isBotTurn, isBotThinking } =
    useGameState({ config: { maxTurns: 10, allowBotPlayer: true, botId } });
  const wordState = useWordState(gameState);
  const gameStats = useGameStats(gameState);

  const [pendingWord, setPendingWord] = useState('');
  const [pendingMoveAttempt, setPendingMoveAttempt] = useState<MoveAttempt | null>(null);

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

  // Report game end to the caller.
  useEffect(() => {
    if (!isGameFinished) return;
    const human = gameState.players.find(p => p.id === 'human')?.score || 0;
    const bot = gameState.players.find(p => p.id === 'bot')?.score || 0;
    const winner = human > bot ? 'human' : bot > human ? 'bot' : null;
    onGameEnd?.(winner, { human, bot });
  }, [isGameFinished, gameState.players, onGameEnd]);

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
        onExit?.();
        return;
      }
      // '?' (help) and '≡' (menu) are deferred in this slice - no-op.
      if (action === '?' || action === '≡') return;

      if (!canEdit) return;
      if (action === '↻') {
        handleWordChange(wordState.currentWord);
      }
    },
    [canEdit, handleWordChange, wordState.currentWord, onExit]
  );

  const isValidSubmit = pendingMoveAttempt?.canApply || false;
  const wordUnchanged = pendingWord === wordState.currentWord;

  const handleSubmit = useCallback(() => {
    if (!canEdit) return;

    if (isValidSubmit && pendingMoveAttempt) {
      triggerHapticFeedback('submit');
      actions.applyMove(pendingMoveAttempt);
      return;
    }

    // Invalid word (or unchanged) -> pass turn, matching web's SubmitButton
    // behavior ("Word is invalid - tap to pass turn").
    if (wordUnchanged || !isValidSubmit) {
      actions.passTurn();
    }
  }, [canEdit, isValidSubmit, pendingMoveAttempt, wordUnchanged, actions]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ScoreBar
          players={gameState.players}
          botDisplayName={botDisplayName}
          currentRound={gameState.players.length > 0 ? Math.ceil(gameState.currentTurn / gameState.players.length) : undefined}
        />
        <Text style={[styles.turnsRemaining, { color: colors.textSecondary }]}>
          {gameStats.turnsRemaining} rounds left
        </Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between'
  },
  header: {
    alignItems: 'center',
    paddingTop: 12
  },
  turnsRemaining: {
    fontSize: 12,
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
