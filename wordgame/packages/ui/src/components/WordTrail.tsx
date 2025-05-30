import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * WordTrail displays a vertical stack of previous words in all-caps, bold, centered.
 * @param words - array of previous words (most recent last)
 */
export interface WordTrailProps {
  words: string[];
}

export const WordTrail: React.FC<WordTrailProps> = ({ words }) => {
  return (
    <View style={styles.container}>
      {words.map((word, i) => (
        <Text key={i} style={styles.word}>
          {word.toUpperCase()}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  word: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#19405B', // dark blue from design
    letterSpacing: 1,
    marginVertical: 2,
  },
}); 