/**
 * Native Thoughts Overlay - direct port of apps/web's
 * `components/ui/ThoughtsOverlay.tsx`. Simple full-screen informational
 * overlay (same flat visual language as DictionariesOverlay/AlertOverlay)
 * listing a numbered set of thoughts/notes.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';

export interface ThoughtsOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const THOUGHTS: string[] = [
  'Dark mode is my favorite. So it is hard to find.',
  'Unlocks will never alter points or give advantage.'
];

export const ThoughtsOverlay: React.FC<ThoughtsOverlayProps> = ({ isVisible, onClose }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  if (!isVisible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} accessibilityRole="none">
      <ScrollView contentContainerStyle={styles.content}>
        {THOUGHTS.map((thought, index) => (
          <View key={index} style={styles.item}>
            <Text style={[styles.itemNumber, { color: colors.textSecondary }]}>{index + 1}.</Text>
            <Text style={[styles.itemText, { color: colors.text }]}>{thought}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
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
  item: {
    flexDirection: 'row',
    gap: 8
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '900'
  },
  itemText: {
    flex: 1,
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
