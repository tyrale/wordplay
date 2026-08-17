/**
 * Native ScoreDisplay - direct port of apps/web's
 * `components/game/ScoreDisplay.tsx`. Replaces this port's earlier
 * SubmitButton.tsx (a large circular checkmark/× button) with web's
 * actual design: a single compact three-part inline row (action icons
 * left, ✓/✗ center, score/timer right) that also doubles as the submit
 * button, matching web pixel-for-pixel rather than an invented native
 * layout.
 *
 * Unlike web (which receives a pre-computed `ScoreBreakdown`/`ActionState`
 * from each caller), this takes the raw `MoveAttempt` directly and
 * derives both internally - one less thing every screen (InteractiveGame/
 * ZenGame/ChallengeGame) has to duplicate.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { MoveAttempt } from '@wordplay/engine/interfaces';

export interface ScoreDisplayProps {
  /** The pending move's attemptMove() result, or null when the word is
   * unchanged from the current word (no move in progress). */
  moveAttempt: MoveAttempt | null;
  isValid: boolean;
  onPress?: () => void;
  disabled?: boolean;
  isPassMode?: boolean;
  showValidationError?: boolean;
  /** Hides score numbers even when a valid move is pending (challenge/
   * zen modes don't show points). */
  isChallengeMode?: boolean;
  /** Whole-game boss countdown or per-turn time-pressure countdown -
   * takes priority over score/instruction content when set. */
  timerSeconds?: number | null;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  moveAttempt,
  isValid,
  onPress,
  disabled = false,
  isPassMode = false,
  showValidationError = false,
  isChallengeMode = false,
  timerSeconds = null
}) => {
  const { currentTheme } = useTheme();

  const actions = moveAttempt?.scoringResult?.actions ?? [];
  const actionIcons: string[] = [];
  if (actions.some(a => a.type === 'rearrange')) actionIcons.push('~');
  if (actions.some(a => a.type === 'remove')) actionIcons.push('-');
  if (actions.some(a => a.type === 'add')) actionIcons.push('+');
  const isEmpty = actionIcons.length === 0;

  let leftContent = '';
  if (showValidationError) {
    leftContent = moveAttempt?.validationResult?.userMessage || 'current word';
  } else if (!isEmpty) {
    leftContent = actionIcons.join(' ');
  }

  const centerContent = isPassMode ? 'pass turn' : isValid && !isEmpty ? '✓' : '✗';

  let rightContent = '';
  if (showValidationError) {
    rightContent = 'tap to pass';
  } else if (!isEmpty && !isPassMode && !isChallengeMode) {
    const baseScore = moveAttempt?.scoringResult?.baseScore ?? 0;
    const keyBonus = moveAttempt?.scoringResult?.keyLetterScore ?? 0;
    rightContent = baseScore > 0 ? `${baseScore}` : '0';
    if (keyBonus > 0) rightContent += ` +${keyBonus}`;
  }
  if (typeof timerSeconds === 'number') {
    rightContent = `${timerSeconds}`;
  }

  const color = isPassMode || (isValid && !isEmpty) ? currentTheme.colors.accent : currentTheme.colors.accent;
  const centerColor = isEmpty && !showValidationError ? currentTheme.colors.text : currentTheme.colors.accent;
  const opacity = disabled ? 0.4 : isEmpty && !showValidationError ? 0.5 : 1;

  const isClickable = !!onPress && !disabled;
  const getAccessibilityLabel = () => {
    if (isPassMode) return 'Pass turn';
    return isValid && !isEmpty ? 'Submit word' : 'Word is invalid - tap to pass turn';
  };

  return (
    <Pressable
      onPress={isClickable ? onPress : undefined}
      disabled={!isClickable}
      accessibilityRole={isClickable ? 'button' : 'text'}
      accessibilityLabel={getAccessibilityLabel()}
      style={[styles.row, { opacity }]}
    >
      <Text style={[styles.side, styles.left, { color }]}>{leftContent}</Text>
      <Text style={[styles.center, { color: centerColor }]}>{centerContent}</Text>
      <Text style={[styles.side, styles.right, { color }]}>{rightContent}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 100
  },
  side: {
    fontSize: 14,
    fontWeight: '900',
    minWidth: 28,
    textAlign: 'center'
  },
  left: {
    textAlign: 'right'
  },
  right: {
    textAlign: 'left'
  },
  center: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center'
  }
});
