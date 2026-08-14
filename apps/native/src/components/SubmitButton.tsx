/**
 * Ports apps/web's `components/game/SubmitButton.tsx` nearly verbatim -
 * this component was already almost entirely presentation logic with no
 * DOM-specific behavior.
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { CheckIcon, CloseIcon } from './icons';

export interface SubmitButtonProps {
  isValid: boolean;
  onPress?: () => void;
  disabled?: boolean;
  isPassMode?: boolean;
  isInvalid: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isValid,
  onPress,
  disabled = false,
  isPassMode = false,
  isInvalid
}) => {
  const { currentTheme } = useTheme();
  const canPress = (isValid || isPassMode) && !disabled && !!onPress;

  const getAccessibilityLabel = () => {
    if (isPassMode) return 'Pass turn';
    return isValid ? 'Submit word' : 'Word is invalid - tap to pass turn';
  };

  // Rendered as an explicit vector icon rather than the '×'/'✓' Unicode
  // characters - see components/icons.tsx's doc comment for why (a
  // platform font-fallback inconsistency the user found on Android).
  const Icon = isInvalid ? CloseIcon : CheckIcon;
  const color = isInvalid ? '#DC2626' : currentTheme.colors.accent;

  return (
    <Pressable
      onPress={canPress ? onPress : undefined}
      disabled={!canPress}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      style={({ pressed }) => [
        styles.button,
        { borderColor: color, opacity: !canPress ? 0.4 : pressed ? 0.7 : 1 }
      ]}
    >
      <Icon size={26} color={color} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
