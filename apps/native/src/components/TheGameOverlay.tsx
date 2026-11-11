/**
 * Native "the game" overlay - direct port of apps/web's
 * `components/ui/TheGameOverlay.tsx`. Simple full-screen informational
 * overlay (same flat visual language as DictionariesOverlay/
 * ThoughtsOverlay) describing reword and why it was built.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { triggerSoundFeedback } from '../utils/sound';

export interface TheGameOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const PARAGRAPHS: string[] = [
  'reword is a word game about finding as many words as you can hiding inside one long word.',
  "I built it because I wanted a quick, replayable word game I could play in a couple of minutes, and because I love watching people discover words they didn't know they knew.",
  "It's a side project made in my spare time. Thanks for playing."
];

export const TheGameOverlay: React.FC<TheGameOverlayProps> = ({ isVisible, onClose }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  if (!isVisible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} accessibilityRole="none">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.accent }]}>the game</Text>

        {PARAGRAPHS.map((paragraph, index) => (
          <Text key={index} style={[styles.paragraph, { color: colors.text }]}>{paragraph}</Text>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => {
          triggerSoundFeedback('click');
          onClose();
        }}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
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
    gap: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.9
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
