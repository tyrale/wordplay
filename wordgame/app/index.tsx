import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  const gameWords = ['PLAY', 'PLAYS', 'PLATS', 'SPLAT'];
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % gameWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>WordGame</Text>
        <Text style={styles.subtitle}>Turn-based Word Building Game</Text>
      </View>

      {/* Platform Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Platform Status</Text>
        <Text style={styles.platformText}>
          Running on: {Platform.OS} • {Platform.select({
            ios: 'iOS',
            android: 'Android', 
            web: 'Web Browser',
            default: 'Unknown'
          })}
        </Text>
      </View>

      {/* Development Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Development Progress</Text>
        <View style={styles.progressItem}>
          <Text style={styles.phaseComplete}>✅ Phase 1: Game Engine</Text>
          <Text style={styles.phaseDetail}>Core word validation, scoring, game state management</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.phaseInProgress}>🚧 Phase 2: UI Components</Text>
          <Text style={styles.phaseDetail}>Interactive game board, letter animations, responsive design</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.phasePending}>⏳ Phase 3: Multiplayer</Text>
          <Text style={styles.phaseDetail}>Real-time gameplay, user accounts, matchmaking</Text>
        </View>
      </View>

      {/* Interactive Demo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Game Engine Demo</Text>
        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>Current Word:</Text>
          <Text style={styles.currentWord}>{gameWords[currentWordIndex]}</Text>
          <Text style={styles.demoDescription}>
            Watch as words evolve: PLAY → PLAYS → PLATS → SPLAT
          </Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score System Active</Text>
          <Text style={styles.scoreValue}>
            {gameWords[currentWordIndex].length * 10} points
          </Text>
        </View>
      </View>

      {/* Architecture Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Modern Architecture</Text>
        <Text style={styles.architectureItem}>🏗️ New React Native Architecture</Text>
        <Text style={styles.architectureItem}>🗂️ Expo Router (File-based routing)</Text>
        <Text style={styles.architectureItem}>📱 Cross-platform (iOS, Android, Web)</Text>
        <Text style={styles.architectureItem}>⚡ Metro bundler with optimizations</Text>
        <Text style={styles.architectureItem}>🧪 Jest + TypeScript testing</Text>
      </View>

      {/* Navigation */}
      <Link href="/game" style={styles.link}>
        <Text style={styles.linkText}>Start Game →</Text>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  platformText: {
    fontSize: 14,
    color: '#34495e',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  progressItem: {
    marginBottom: 15,
  },
  phaseComplete: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '500',
    marginBottom: 4,
  },
  phaseInProgress: {
    fontSize: 16,
    color: '#f39c12',
    fontWeight: '500',
    marginBottom: 4,
  },
  phasePending: {
    fontSize: 16,
    color: '#95a5a6',
    fontWeight: '500',
    marginBottom: 4,
  },
  phaseDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 20,
  },
  demoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  demoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  currentWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    letterSpacing: 2,
    marginBottom: 8,
  },
  demoDescription: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  architectureItem: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  link: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  linkText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 