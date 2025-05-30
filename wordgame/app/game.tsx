import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';

// Import game engine components (these will be from your packages)
// import { AlphabetGrid, WordTrail, ActionBar } from '../packages/ui/src';
// import { GameEngine } from '../packages/engine/src';

export default function GameScreen() {
  const [currentWord, setCurrentWord] = React.useState('PLAY');
  const [score, setScore] = React.useState(0);
  const [gameState, setGameState] = React.useState<'playing' | 'paused' | 'finished'>('playing');

  // Mock game data - will be replaced with actual game engine
  const mockLetters = ['P', 'L', 'A', 'Y', 'S', 'T', 'R', 'I', 'N', 'G'];
  const mockWordHistory = ['PLAY', 'PLAYS', 'PLATS'];

  const handleLetterPress = (letter: string) => {
    console.log('Letter pressed:', letter);
    // This will integrate with the actual game engine
  };

  const handleSubmitWord = () => {
    console.log('Word submitted:', currentWord);
    setScore(prev => prev + currentWord.length * 10);
  };

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.score}>Score: {score}</Text>
      </View>

      {/* Current Word Display */}
      <View style={styles.wordSection}>
        <Text style={styles.sectionTitle}>Current Word</Text>
        <Text style={styles.currentWord}>{currentWord}</Text>
      </View>

      {/* Mock Letter Grid */}
      <View style={styles.letterSection}>
        <Text style={styles.sectionTitle}>Available Letters</Text>
        <View style={styles.letterGrid}>
          {mockLetters.map((letter, index) => (
            <TouchableOpacity
              key={index}
              style={styles.letterButton}
              onPress={() => handleLetterPress(letter)}
            >
              <Text style={styles.letterText}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Word History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Word History</Text>
        <View style={styles.historyContainer}>
          {mockWordHistory.map((word, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyWord}>{word}</Text>
              <Text style={styles.historyScore}>{word.length * 10}pts</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.submitButton]}
          onPress={handleSubmitWord}
        >
          <Text style={styles.actionButtonText}>Submit Word</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.clearButton]}
          onPress={() => setCurrentWord('')}
        >
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Development Note */}
      <View style={styles.devNote}>
        <Text style={styles.devNoteText}>
          🚧 This is a UI mockup. Game engine integration coming in Phase 2.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  wordSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 15,
  },
  currentWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
    letterSpacing: 4,
  },
  letterSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  letterButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  letterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  historySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  historyItem: {
    alignItems: 'center',
  },
  historyWord: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  historyScore: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#27ae60',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  devNote: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  devNoteText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 