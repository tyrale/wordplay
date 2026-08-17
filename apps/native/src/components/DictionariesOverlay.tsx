/**
 * Native Dictionaries Overlay - direct port of apps/web's
 * `components/ui/DictionariesOverlay.tsx`. Simple full-screen
 * informational overlay listing every word list the game validates
 * words against, with a short description of each.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../providers/UnlockProvider';

export interface DictionariesOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

interface DictionaryEntry {
  name: string;
  description: string;
}

const DICTIONARIES: DictionaryEntry[] = [
  {
    name: 'ENABLE Word List',
    description: 'The core English dictionary — about 172,819 words.'
  },
  {
    name: 'Slang',
    description: 'Modern informal words and internet slang accepted in casual play.'
  },
  {
    name: 'Common Proper Nouns',
    description: 'Months, days of the week, and common first names.'
  },
  {
    name: 'Profanity List',
    description: 'Used to catch and mask bad words with the vanity filter.'
  }
];

const SEUSS_DICTIONARY: DictionaryEntry = {
  name: 'Dr. Seuss Words',
  description: 'Canonical Dr. Seuss words (LORAX, GRINCH, WOCKET, etc.) accepted as valid plays. Unlocked by beating the Grinchbot.'
};

export const DictionariesOverlay: React.FC<DictionariesOverlayProps> = ({ isVisible, onClose }) => {
  const { currentTheme } = useTheme();
  const { getUnlockedItems } = useUnlockSystem();
  const seussUnlocked = getUnlockedItems('mechanic').includes('seuss-canonical-words');

  if (!isVisible) return null;

  const dictionaries = seussUnlocked ? [...DICTIONARIES, SEUSS_DICTIONARY] : DICTIONARIES;

  return (
    <View style={[styles.overlay, { backgroundColor: currentTheme.colors.background }]} accessibilityRole="none">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: currentTheme.colors.accent }]}>dictionaries</Text>

        {dictionaries.map(entry => (
          <View key={entry.name} style={styles.item}>
            <Text style={[styles.itemName, { color: currentTheme.colors.text }]}>{entry.name}</Text>
            <Text style={[styles.itemDescription, { color: currentTheme.colors.textSecondary }]}>{entry.description}</Text>
          </View>
        ))}

        <Text style={[styles.footnote, { color: currentTheme.colors.textSecondary }]}>
          I allow for more words than other word games because ¯\_(ツ)_/¯.
        </Text>
      </ScrollView>

      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={[styles.closeButtonText, { color: currentTheme.colors.text }]}>×</Text>
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
  item: {
    gap: 4
  },
  itemName: {
    fontSize: 16,
    fontWeight: '900'
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  footnote: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 12
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
