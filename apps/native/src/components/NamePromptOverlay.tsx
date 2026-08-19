/**
 * Ports apps/web's `components/multiplayer/NamePromptOverlay.tsx` - shown
 * once, the first time a player enters vs-human multiplayer, so they can
 * pick a vanity display name (shown to opponents in place of "P1"/"P2"
 * and as the game title in their active-games list). Purely cosmetic -
 * the player's unique id (used for all game logic) is unaffected and
 * doesn't need to be unique across the system.
 *
 * Also reused mid-game when a player taps their own name to rename
 * themselves (see `onCancel`).
 *
 * Reuses the same banner-pinned-near-the-top styling as
 * TutorialOverlay.tsx, just with a text input in place of the scripted
 * step lines/progress dots (web reuses TutorialOverlay.css for the same
 * reason - this is presentational parity, not a coincidence).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface NamePromptOverlayProps {
  isVisible: boolean;
  defaultName: string;
  onSubmit: (name: string) => void;
  /** First line of banner copy. Defaults to the vs-human first-time prompt. */
  title?: string;
  /** Second line of banner copy. */
  subtitle?: string;
  /** Label for the submit button. Defaults to "Continue". */
  submitLabel?: string;
  /**
   * When provided, renders a "Cancel" link and calls this instead of
   * `onSubmit` - used when re-opening the overlay to rename an already-set
   * display name (tapping your own name mid-game), where dismissing
   * without changes should be possible.
   */
  onCancel?: () => void;
}

export const NamePromptOverlay: React.FC<NamePromptOverlayProps> = ({
  isVisible,
  defaultName,
  onSubmit,
  title = 'Pick a name',
  subtitle = 'Opponents will see this',
  submitLabel = 'Continue',
  onCancel
}) => {
  const { currentTheme } = useTheme();
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (isVisible) setName(defaultName);
  }, [isVisible, defaultName]);

  if (!isVisible) return null;

  const handleSubmit = () => {
    onSubmit(name.trim() || defaultName);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.surface }]} pointerEvents="box-none">
      <View style={styles.lines}>
        <Text style={[styles.line, { color: currentTheme.colors.text }]}>{title}</Text>
        <Text style={[styles.line, { color: currentTheme.colors.text }]}>{subtitle}</Text>
      </View>

      <TextInput
        style={[styles.input, { color: currentTheme.colors.text, borderColor: currentTheme.colors.text }]}
        value={name}
        onChangeText={setName}
        maxLength={10}
        autoFocus
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        accessibilityLabel="Display name"
      />

      <Pressable onPress={handleSubmit} accessibilityRole="button" accessibilityLabel={submitLabel}>
        <Text style={[styles.submit, { color: currentTheme.colors.accent }]}>{submitLabel}</Text>
      </Pressable>

      {onCancel && (
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={[styles.cancel, { color: currentTheme.colors.textSecondary }]}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 500
  },
  lines: {
    alignItems: 'center'
  },
  line: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 160
  },
  submit: {
    fontSize: 15,
    fontWeight: '900'
  },
  cancel: {
    fontSize: 13,
    textDecorationLine: 'underline'
  }
});
