/**
 * Ports apps/web's `components/game/SubmitButton.tsx` nearly verbatim -
 * this component was already almost entirely presentation logic with no
 * DOM-specific behavior.
 */
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

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

  const icon = isInvalid ? '×' : '✓';
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
      <Text style={[styles.icon, { color }]}>{icon}</Text>
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
  },
  icon: {
    fontSize: 28,
    fontWeight: '900'
  }
});
