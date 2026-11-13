/**
 * Native Word Path Explorer - direct port of apps/web's
 * `components/ui/WordPathExplorer.tsx`. Simple, text-only interface for a
 * player to navigate their local word path graph (every word they've ever
 * seen, connected by moves that actually changed the word). Two modes:
 *
 *  - "typing": the player types a word with the device's own keyboard. As
 *    soon as a word they've seen is typed, its connected words are listed
 *    below it.
 *  - "browsing": after tapping a connected word from the list, that word
 *    becomes the active word (its own connections are listed below it in
 *    turn). An X below the active word clears it and returns to typing mode.
 *
 * One layout simplification from web: web overlays an invisible-caret
 * `<input>` directly on top of a separate `WordBuilder` display so the
 * typed text renders through WordBuilder's own letter styling underneath
 * - a browser-only trick with no direct RN equivalent (no invisible-text-
 * with-visible-caret input mode). Native just shows a single, visibly
 * styled `TextInput` instead - same information, one fewer moving part.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import type { TextInputInstance } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { useWordPathGraph } from '../providers/WordPathGraphProvider';
import { triggerHapticFeedback } from '../utils/haptics';
import { triggerSoundFeedback } from '../utils/sound';
import { calculateScore } from '@wordplay/engine/scoring';

export interface WordPathExplorerProps {
  isVisible: boolean;
  onClose: () => void;
}

const MAX_WORD_LENGTH = 10;

/** Builds the +/-/~ action-icon string (add/remove/rearrange) for the
 * move from `fromWord` to `toWord`, matching the icons shown during
 * gameplay (see `ScoreDisplay.tsx`). */
function getActionIcons(fromWord: string, toWord: string): string {
  const { actions } = calculateScore(fromWord, toWord);
  const icons: string[] = [];
  if (actions.some(action => action.type === 'rearrange')) icons.push('~');
  if (actions.some(action => action.type === 'remove')) icons.push('-');
  if (actions.some(action => action.type === 'add')) icons.push('+');
  return icons.join(' ');
}

export const WordPathExplorer: React.FC<WordPathExplorerProps> = ({ isVisible, onClose }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);
  const { hasSeenWord, getConnectedWords } = useWordPathGraph();
  const [word, setWord] = useState('');
  const [mode, setMode] = useState<'typing' | 'browsing'>('typing');
  const inputRef = useRef<TextInputInstance>(null);

  const handleChangeText = useCallback((text: string) => {
    const sanitized = text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, MAX_WORD_LENGTH);
    setWord(sanitized);
  }, []);

  const handleSelectConnectedWord = useCallback((connectedWord: string) => {
    setWord(connectedWord);
    setMode('browsing');
    triggerHapticFeedback('submit');
    triggerSoundFeedback('submit');
  }, []);

  const handleClearActiveWord = useCallback(() => {
    setWord('');
    setMode('typing');
    triggerHapticFeedback('remove');
    triggerSoundFeedback('remove');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleFullClose = useCallback(() => {
    setWord('');
    setMode('typing');
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  const trimmedWord = word.trim();
  const seen = trimmedWord.length > 0 && hasSeenWord(trimmedWord);
  const connectedWords = seen ? getConnectedWords(trimmedWord) : [];

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} accessibilityRole="none">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.wordDisplay}>
          {mode === 'typing' ? (
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={word}
              onChangeText={handleChangeText}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              maxLength={MAX_WORD_LENGTH}
              accessibilityLabel="Type a word"
              placeholder="type a word"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={[styles.activeWord, { color: colors.text }]}>{word}</Text>
          )}
        </View>

        {mode === 'browsing' && (
          <Pressable onPress={handleClearActiveWord} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Clear active word">
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>×</Text>
          </Pressable>
        )}

        <View style={styles.results}>
          {trimmedWord.length === 0 ? (
            <Text style={[styles.hint, { color: colors.text }]}>type a word to see its path</Text>
          ) : !seen ? (
            <Text style={[styles.hint, { color: colors.text }]}>you haven't seen this yet</Text>
          ) : connectedWords.length === 0 ? (
            <Text style={[styles.hint, { color: colors.text }]}>no connections yet</Text>
          ) : (
            connectedWords.map(connectedWord => (
              <Pressable
                key={connectedWord}
                onPress={() => handleSelectConnectedWord(connectedWord)}
                style={styles.connectionRow}
                accessibilityRole="button"
              >
                <Text style={[styles.connectionWord, { color: colors.accent }]}>{connectedWord}</Text>
                <Text style={[styles.connectionIcons, { color: colors.text }]}>
                  {getActionIcons(trimmedWord, connectedWord)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Pressable onPress={handleFullClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
    alignItems: 'center',
    gap: 12
  },
  wordDisplay: {
    minHeight: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  input: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    minWidth: 160
  },
  activeWord: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2
  },
  clearButton: {
    padding: 8
  },
  clearButtonText: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 28
  },
  results: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    marginTop: 12
  },
  hint: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center'
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4
  },
  connectionWord: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1
  },
  connectionIcons: {
    fontSize: 16,
    fontWeight: '900'
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    padding: 12
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 32
  }
});
