/**
 * Native Challenge Game screen ("vs world") - a significantly scoped-down
 * port of apps/web's `components/challenge/ChallengeGame.tsx` (~800
 * lines). Deliberately deferred, not silently dropped (each needs
 * infrastructure this port doesn't have yet, several shared with
 * InteractiveGame.tsx/ZenGame.tsx's existing documented gaps): the
 * dictionary/help lookup, word-path graph syncing, the drunk mechanic's
 * visual effect, and the "GUS" boss-battle trigger forward. The
 * challenge's actual daily-word logic, validation, unlock checking,
 * player-stats recording, and the server-side leaderboard are all fully
 * real - see hooks/useChallenge.ts's doc comment for why the daily word
 * itself needs no server dependency (it's a client-side seeded RNG keyed
 * off the date).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { useChallenge } from '../hooks/useChallenge';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { AlphabetGrid } from '../components/AlphabetGrid';
import type { LetterState } from '../components/AlphabetGrid';
import { CurrentWord } from '../components/CurrentWord';
import { SubmitButton } from '../components/SubmitButton';
import { Menu } from '../components/Menu';
import { AlertOverlay } from '../components/AlertOverlay';
import type { AlertOverlayVariant } from '../components/AlertOverlay';
import { LeaderboardOverlay } from '../components/LeaderboardOverlay';
import { alertCopy } from '../content/alertCopy';
import { recordChallengeCompletion } from '../adapters/nativeChallengeLeaderboardAdapter';
import { shareChallengeResult } from '../utils/shareUtils';
import { triggerHapticFeedback } from '../utils/haptics';

const MAX_WORD_LENGTH = 10;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface ChallengeGameProps {
  onNavigateHome?: () => void;
}

interface CompletionOverlayState {
  isWinner: boolean;
  shareText: string;
}

export const ChallengeGame: React.FC<ChallengeGameProps> = ({ onNavigateHome }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  const {
    challengeState,
    isLoading,
    isInitialized,
    startChallenge,
    submitWord,
    forfeitChallenge,
    generateSharingText,
    isValidMove
  } = useChallenge();
  const { handleWordSubmission } = useUnlockSystem();
  const { recordMove, recordChallengeResult } = usePlayerStats();

  const [pendingWord, setPendingWord] = useState('');
  const [isValidSubmit, setIsValidSubmit] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [completionOverlay, setCompletionOverlay] = useState<CompletionOverlayState | null>(null);
  const hasHandledCompletionRef = React.useRef(false);

  useEffect(() => {
    if (isInitialized && !challengeState && !isLoading) {
      startChallenge();
    }
  }, [isInitialized, challengeState, isLoading, startChallenge]);

  useEffect(() => {
    if (challengeState?.currentWord) {
      setPendingWord(challengeState.currentWord);
    }
  }, [challengeState?.currentWord]);

  // Re-validate whenever the pending word changes (mirrors web's
  // validatePendingWord effect, simplified: this screen doesn't need the
  // full ActionState/ScoreBreakdown web computes for its ScoreDisplay,
  // since this screen's SubmitButton only needs a valid/invalid boolean).
  useEffect(() => {
    if (!pendingWord || !challengeState || pendingWord === challengeState.currentWord) {
      setIsValidSubmit(false);
      return;
    }
    if (challengeState.wordSequence.includes(pendingWord)) {
      setIsValidSubmit(false);
      return;
    }
    setIsValidSubmit(isValidMove(challengeState.currentWord, pendingWord));
  }, [pendingWord, challengeState, isValidMove]);

  const letterStates: LetterState[] = useMemo(() => {
    // Challenge mode has no key/locked letters (matches web).
    return ALPHABET.map(letter => ({ letter, state: 'normal' as const }));
  }, []);

  const canEdit = !isProcessingMove && !!challengeState && !challengeState.completed && !challengeState.failed;

  const handleWordChange = useCallback((newWord: string) => {
    setPendingWord(newWord);
    setShowValidationError(false);
  }, []);

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
      handleWordChange(pendingWord.slice(0, index) + pendingWord.slice(index + 1));
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
        handleWordChange(challengeState?.currentWord || '');
      }
    },
    [canEdit, handleWordChange, challengeState?.currentWord, onNavigateHome]
  );

  const wordUnchanged = pendingWord === (challengeState?.currentWord || '');

  const handleSubmit = useCallback(async () => {
    if (!canEdit) return;

    // Tapping the X while the word is unchanged clears all letters, same
    // shortcut as InteractiveGame/ZenGame.
    if (!isValidSubmit && wordUnchanged && !showValidationError) {
      handleWordChange('');
      return;
    }

    if (!isValidSubmit) {
      if (!showValidationError) {
        setShowValidationError(true);
        return;
      }
      // Second tap on the X with the error already showing forfeits.
      try {
        setIsProcessingMove(true);
        await forfeitChallenge();
      } finally {
        setIsProcessingMove(false);
      }
      return;
    }

    try {
      setIsProcessingMove(true);
      const result = await submitWord(pendingWord);
      if (result.success) {
        triggerHapticFeedback('submit');
        setShowValidationError(false);
        handleWordSubmission(pendingWord, false).catch(err =>
          console.warn('Failed to check challenge word submission unlock triggers:', err)
        );
        if (challengeState) {
          recordMove({
            turnNumber: challengeState.wordSequence.length + 1,
            playerId: 'human',
            previousWord: challengeState.currentWord,
            newWord: pendingWord,
            score: 0,
            keyLettersUsed: [],
            scoringBreakdown: {
              score: 0, totalScore: 0, baseScore: 0, keyLetterScore: 0, keyLettersUsed: [],
              breakdown: { addLetterPoints: 0, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 0 },
              actions: []
            },
            timestamp: Date.now()
          }).catch(err => console.warn('Failed to record challenge move stats:', err));
        }
      } else {
        setShowValidationError(true);
      }
    } catch {
      setShowValidationError(true);
    } finally {
      setIsProcessingMove(false);
    }
  }, [canEdit, isValidSubmit, wordUnchanged, showValidationError, forfeitChallenge, submitWord, pendingWord, handleWordChange, handleWordSubmission, challengeState, recordMove]);

  const handleResign = useCallback(async () => {
    try {
      setIsProcessingMove(true);
      await forfeitChallenge();
    } finally {
      setIsProcessingMove(false);
    }
  }, [forfeitChallenge]);

  // Check for challenge completion or failure.
  useEffect(() => {
    if (!challengeState || (!challengeState.completed && !challengeState.failed)) {
      hasHandledCompletionRef.current = false;
      return;
    }
    if (hasHandledCompletionRef.current) return;
    hasHandledCompletionRef.current = true;

    const isWinner = challengeState.completed;
    const shareText = generateSharingText();
    setCompletionOverlay({ isWinner, shareText });

    recordChallengeResult({
      completed: isWinner,
      stepCount: challengeState.wordSequence.length,
      timestamp: Date.now()
    }).catch(err => console.warn('Failed to record challenge result stats:', err));

    if (challengeState.completed) {
      recordChallengeCompletion(challengeState.date, challengeState.stepCount).catch(err =>
        console.warn('Failed to record challenge completion to leaderboard:', err)
      );
    }
  }, [challengeState, generateSharingText, recordChallengeResult]);

  const handleShare = useCallback(async () => {
    if (!completionOverlay) return;
    await shareChallengeResult(completionOverlay.shareText).catch(err =>
      console.warn('Failed to share challenge result:', err)
    );
  }, [completionOverlay]);

  const completionVariant: AlertOverlayVariant | undefined = completionOverlay
    ? (completionOverlay.isWinner ? 'win' : 'lose')
    : undefined;
  const completionCopy = completionOverlay
    ? (completionOverlay.isWinner ? alertCopy.challenge.win : alertCopy.challenge.lose)
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.wordArea}>
        <CurrentWord word={pendingWord} onLetterPress={canEdit ? handleRemoveLetter : undefined} />
        <View style={styles.submitRow}>
          <SubmitButton
            isValid={isValidSubmit}
            isInvalid={!isValidSubmit && !wordUnchanged}
            onPress={canEdit ? handleSubmit : undefined}
            disabled={!canEdit}
          />
        </View>
        <Text style={[styles.steps, { color: colors.textSecondary }]}>
          {/* stepCount (not wordSequence.length, which is seeded with the
              start word and so starts at 1) - this on-screen counter is
              this port's own addition, not something web renders inside
              ChallengeGame itself. */}
          {challengeState ? `${challengeState.stepCount} steps` : ''}
        </Text>
      </View>

      <AlphabetGrid
        letterStates={letterStates}
        onLetterPress={handleLetterPress}
        onActionPress={handleActionPress}
        disabled={!canEdit}
      />

      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isInGame
        onResign={handleResign}
        onNavigateHome={onNavigateHome}
      />

      {completionOverlay && completionCopy && (
        <AlertOverlay
          // Hidden (fully unmounted, not just visually covered) while the
          // leaderboard is open on top of it - AlertOverlay sets
          // accessibilityViewIsModal, which marks *sibling* content
          // (including a LeaderboardOverlay layered on top of it, not
          // nested inside it) as inaccessible to screen readers. Two
          // simultaneously "modal" siblings would make the top one
          // unreachable by assistive tech even though it's visually on
          // top - a real accessibility bug, not just a rendering quirk.
          isVisible={!isLeaderboardOpen}
          lines={[...completionCopy.lines]}
          variant={completionVariant}
          actions={[{ label: 'share', onPress: handleShare }, { label: 'leaderboard', onPress: () => setIsLeaderboardOpen(true) }]}
          onClose={() => {
            setCompletionOverlay(null);
            onNavigateHome?.();
          }}
        />
      )}

      <LeaderboardOverlay isVisible={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between'
  },
  wordArea: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24
  },
  submitRow: {
    alignItems: 'center'
  },
  steps: {
    fontSize: 13
  }
});
