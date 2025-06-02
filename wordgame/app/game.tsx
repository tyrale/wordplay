import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';

// Import game engine components
import { validateWord, getRandomWord, scoreTurn, useGameState } from '../packages/engine/src';
import { chooseBestMove } from '../packages/ai/src/bot-behavior';
import type { TurnAction, BotMove } from '../packages/ai/src/bot-behavior';

// Game configuration
const GAME_LENGTH = 10;
const STARTING_WORDS = ['SHIP', 'PLAY', 'WORD', 'GAME', 'LOVE', 'HOPE'];

interface GameTurn {
  turn: number;
  word: string;
  actions: TurnAction[];
  score: number;
  player: 'human' | 'bot';
}

interface GameStats {
  humanScore: number;
  botScore: number;
  turnsPlayed: number;
  gameComplete: boolean;
}

export default function GameScreen() {
  // Game state
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([]);
  const [stats, setStats] = useState<GameStats>({
    humanScore: 0,
    botScore: 0,
    turnsPlayed: 0,
    gameComplete: false
  });
  const [currentPlayer, setCurrentPlayer] = useState<'human' | 'bot'>('human');
  const [keyLetter, setKeyLetter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // UI state for word input
  const [inputWord, setInputWord] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  
  // Start new game
  const startNewGame = useCallback(() => {
    const startingWord = STARTING_WORDS[Math.floor(Math.random() * STARTING_WORDS.length)];
    const randomKeyLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    
    setCurrentWord(startingWord);
    setInputWord(startingWord);
    setKeyLetter(randomKeyLetter);
    setGameHistory([]);
    setStats({
      humanScore: 0,
      botScore: 0,
      turnsPlayed: 0,
      gameComplete: false
    });
    setCurrentPlayer('human');
    setGameStarted(true);
    setIsProcessing(false);
    
    console.log(`🎮 New game started! Word: ${startingWord}, Key Letter: ${randomKeyLetter}`);
  }, []);

  // Calculate actions between two words (simplified)
  const calculateActions = (fromWord: string, toWord: string): TurnAction[] => {
    const actions: TurnAction[] = [];
    
    if (fromWord.length < toWord.length) {
      // Word got longer - assume addition
      actions.push({ type: 'ADD', letter: toWord[toWord.length - 1], position: toWord.length - 1 });
    } else if (fromWord.length > toWord.length) {
      // Word got shorter - assume removal
      actions.push({ type: 'REMOVE', letter: fromWord[0], position: 0 });
    }
    
    if (fromWord !== toWord && fromWord.length === toWord.length) {
      // Same length but different - assume rearrange
      actions.push({ type: 'REARRANGE', letter: toWord[0], position: 0 });
    }
    
    return actions;
  };

  // Submit human turn
  const submitHumanTurn = useCallback(() => {
    if (!inputWord.trim() || inputWord === currentWord) {
      Alert.alert('Invalid Move', 'Please enter a different word.');
      return;
    }

    // Validate the word
    const isValid = validateWord(inputWord.toUpperCase(), currentWord, { allowBot: false });
    if (!isValid) {
      Alert.alert('Invalid Word', 'This word is not valid or not allowed.');
      return;
    }

    const newWord = inputWord.toUpperCase();
    const actions = calculateActions(currentWord, newWord);
    const score = scoreTurn(currentWord, newWord, actions, keyLetter);
    
    const turn: GameTurn = {
      turn: stats.turnsPlayed + 1,
      word: newWord,
      actions,
      score,
      player: 'human'
    };

    setGameHistory(prev => [...prev, turn]);
    setStats(prev => ({
      ...prev,
      humanScore: prev.humanScore + score,
      turnsPlayed: prev.turnsPlayed + 1
    }));
    setCurrentWord(newWord);
    setCurrentPlayer('bot');
    
    console.log(`👤 Human turn: ${currentWord} → ${newWord} (${score} points)`);
  }, [inputWord, currentWord, keyLetter, stats.turnsPlayed]);

  // Execute bot turn
  const executeBotTurn = useCallback(() => {
    setIsProcessing(true);
    
    // Small delay to show processing
    setTimeout(() => {
      try {
        const botMove: BotMove = chooseBestMove(currentWord, keyLetter);
        
        const turn: GameTurn = {
          turn: stats.turnsPlayed + 1,
          word: botMove.word,
          actions: botMove.actions,
          score: botMove.score,
          player: 'bot'
        };

        setGameHistory(prev => [...prev, turn]);
        setStats(prev => ({
          ...prev,
          botScore: prev.botScore + botMove.score,
          turnsPlayed: prev.turnsPlayed + 1,
          gameComplete: prev.turnsPlayed + 1 >= GAME_LENGTH
        }));
        setCurrentWord(botMove.word);
        setInputWord(botMove.word);
        setCurrentPlayer('human');
        setIsProcessing(false);
        
        console.log(`🤖 Bot turn: ${currentWord} → ${botMove.word} (${botMove.score} points)`);
      } catch (error) {
        console.error('Bot turn error:', error);
        setIsProcessing(false);
        Alert.alert('Game Error', 'Bot encountered an error. Starting new game.');
        startNewGame();
      }
    }, 500);
  }, [currentWord, keyLetter, stats.turnsPlayed, startNewGame]);

  // Auto-execute bot turns
  useEffect(() => {
    if (currentPlayer === 'bot' && !isProcessing && !stats.gameComplete && gameStarted) {
      executeBotTurn();
    }
  }, [currentPlayer, isProcessing, stats.gameComplete, gameStarted, executeBotTurn]);

  // Game over effect
  useEffect(() => {
    if (stats.gameComplete) {
      const winner = stats.humanScore > stats.botScore ? 'You win!' : 
                    stats.humanScore < stats.botScore ? 'Bot wins!' : 'Tie game!';
      
      setTimeout(() => {
        Alert.alert(
          'Game Over!',
          `${winner}\n\nYour Score: ${stats.humanScore}\nBot Score: ${stats.botScore}`,
          [
            { text: 'New Game', onPress: startNewGame },
            { text: 'Back to Menu', onPress: () => router.back() }
          ]
        );
      }, 1000);
    }
  }, [stats.gameComplete, stats.humanScore, stats.botScore, startNewGame]);

  const renderGameStatus = () => {
    if (!gameStarted) {
      return (
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Ready to Play?</Text>
          <Text style={styles.statusText}>
            You'll play against a smart AI bot for {GAME_LENGTH} turns.
            Use the key letter for bonus points!
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startNewGame}>
            <Text style={styles.startButtonText}>Start New Game</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>
          Turn {stats.turnsPlayed + 1} of {GAME_LENGTH}
        </Text>
        <Text style={styles.statusText}>
          {currentPlayer === 'human' ? '👤 Your turn' : '🤖 Bot is thinking...'}
        </Text>
        <Text style={styles.keyLetterText}>Key Letter: {keyLetter}</Text>
      </View>
    );
  };

  const renderWordInput = () => {
    if (!gameStarted || currentPlayer !== 'human' || stats.gameComplete) {
      return null;
    }

    return (
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Current Word: {currentWord}</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.inputBox}
            onPress={() => {
              Alert.prompt(
                'Enter New Word',
                `Transform "${currentWord}" into a new word:`,
                (text) => setInputWord(text || ''),
                'plain-text',
                inputWord
              );
            }}
          >
            <Text style={styles.inputText}>{inputWord || 'Tap to enter word...'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.submitButton, { opacity: inputWord === currentWord ? 0.5 : 1 }]}
          onPress={submitHumanTurn}
          disabled={inputWord === currentWord}
        >
          <Text style={styles.submitButtonText}>Submit Word</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderScoreboard = () => (
    <View style={styles.scoreSection}>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Your Score</Text>
        <Text style={styles.scoreValue}>{stats.humanScore}</Text>
      </View>
      <View style={styles.scoreVs}>
        <Text style={styles.vsText}>VS</Text>
      </View>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Bot Score</Text>
        <Text style={styles.scoreValue}>{stats.botScore}</Text>
      </View>
    </View>
  );

  const renderGameHistory = () => {
    if (gameHistory.length === 0) return null;

    return (
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Game History</Text>
        <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
          {gameHistory.map((turn, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTurn}>Turn {turn.turn}</Text>
                <Text style={styles.historyPlayer}>
                  {turn.player === 'human' ? '👤' : '🤖'}
                </Text>
                <Text style={styles.historyScore}>+{turn.score}pts</Text>
              </View>
              <Text style={styles.historyWord}>{turn.word}</Text>
              <Text style={styles.historyActions}>
                {turn.actions.length > 0 
                  ? turn.actions.map(a => a.type).join(', ')
                  : 'No change'
                }
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Single Player</Text>
        <TouchableOpacity onPress={startNewGame} style={styles.newGameButton}>
          <Text style={styles.newGameButtonText}>New Game</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderGameStatus()}
        {renderScoreboard()}
        {renderWordInput()}
        {renderGameHistory()}
      </ScrollView>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>🤖 Bot is thinking...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  newGameButton: {
    padding: 10,
  },
  newGameButtonText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusSection: {
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
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  keyLetterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scoreVs: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  inputSection: {
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputBox: {
    borderWidth: 2,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  inputText: {
    fontSize: 18,
    color: '#2c3e50',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  historyScroll: {
    flex: 1,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyTurn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  historyPlayer: {
    fontSize: 16,
  },
  historyScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  historyWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 2,
  },
  historyActions: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
}); 