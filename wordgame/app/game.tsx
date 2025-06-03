import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';

// Import game engine components
import { validateWord, getRandomWord, scoreTurn, useGameState } from '../packages/engine/src';
import { chooseBestMove } from '../packages/ai/src/bot-behavior';
import type { TurnAction, BotMove } from '../packages/ai/src/bot-behavior';

// Import UI components
import { AlphabetGrid, WordTrail, ActionBar } from '../packages/ui/src';
import type { ActionBarAction } from '../packages/ui/src/components/ActionBar';

// Game configuration
const GAME_LENGTH = 10;
const STARTING_WORDS = ['SHIP', 'PLAY', 'WORD', 'GAME', 'LOVE', 'HOPE'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
  
  // UI state for word building
  const [currentWord, setCurrentWord] = useState('');
  const [selectedLetters, setSelectedLetters] = useState<number[]>([]);
  const [wordAreaLayout, setWordAreaLayout] = useState<{ x: number; y: number; width: number; height: number }>();
  
  // Start new game
  const startNewGame = useCallback(() => {
    const startingWord = STARTING_WORDS[Math.floor(Math.random() * STARTING_WORDS.length)];
    const randomKeyLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    
    setCurrentWord(startingWord);
    setKeyLetter(randomKeyLetter);
    setSelectedLetters(startingWord.split('').map(letter => ALPHABET.indexOf(letter)));
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

  // Handle letter selection from alphabet grid
  const handleLetterTap = useCallback((letterIndex: number) => {
    if (currentPlayer !== 'human' || isProcessing || stats.gameComplete) return;
    
    const letter = ALPHABET[letterIndex];
    const isSelected = selectedLetters.includes(letterIndex);
    
    if (isSelected) {
      // Remove letter from word
      setSelectedLetters(prev => prev.filter(index => index !== letterIndex));
      setCurrentWord(prev => prev.replace(letter, ''));
    } else {
      // Add letter to word
      setSelectedLetters(prev => [...prev, letterIndex]);
      setCurrentWord(prev => prev + letter);
    }
  }, [currentPlayer, isProcessing, stats.gameComplete, selectedLetters]);

  // Handle drag operations
  const handleLetterDragToWord = useCallback((letterIndex: number) => {
    if (currentPlayer !== 'human' || isProcessing || stats.gameComplete) return;
    if (!selectedLetters.includes(letterIndex)) {
      handleLetterTap(letterIndex);
    }
  }, [currentPlayer, isProcessing, stats.gameComplete, selectedLetters, handleLetterTap]);

  const handleLetterDragFromWordToGrid = useCallback((letterIndex: number) => {
    if (currentPlayer !== 'human' || isProcessing || stats.gameComplete) return;
    if (selectedLetters.includes(letterIndex)) {
      handleLetterTap(letterIndex);
    }
  }, [currentPlayer, isProcessing, stats.gameComplete, selectedLetters, handleLetterTap]);

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
    if (!currentWord.trim() || selectedLetters.length === 0) {
      Alert.alert('Invalid Move', 'Please select letters to form a word.');
      return;
    }

    const originalWord = gameHistory.length > 0 ? gameHistory[gameHistory.length - 1].word : 
                        (gameHistory.length === 0 && gameStarted ? 
                          STARTING_WORDS.find(w => w === currentWord.split('').slice(0, w.length).join('')) || 'SHIP' 
                          : 'SHIP');

    // Validate the word
    const isValid = validateWord(currentWord.toUpperCase(), originalWord, { allowBot: false });
    if (!isValid.valid) {
      Alert.alert('Invalid Word', isValid.reason || 'This word is not valid or not allowed.');
      return;
    }

    const newWord = currentWord.toUpperCase();
    const actions = calculateActions(originalWord, newWord);
    const score = scoreTurn(originalWord, newWord, actions, keyLetter);
    
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
    setCurrentPlayer('bot');
    
    console.log(`👤 Human turn: ${originalWord} → ${newWord} (${score} points)`);
  }, [currentWord, selectedLetters, gameHistory, keyLetter, stats.turnsPlayed, gameStarted]);

  // Execute bot turn
  const executeBotTurn = useCallback(() => {
    setIsProcessing(true);
    
    // Small delay to show processing
    setTimeout(() => {
      try {
        const previousWord = gameHistory.length > 0 ? gameHistory[gameHistory.length - 1].word : currentWord;
        const botMove: BotMove = chooseBestMove(previousWord, keyLetter);
        
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
        setSelectedLetters(botMove.word.split('').map(letter => ALPHABET.indexOf(letter)));
        setCurrentPlayer('human');
        setIsProcessing(false);
        
        console.log(`🤖 Bot turn: ${previousWord} → ${botMove.word} (${botMove.score} points)`);
      } catch (error) {
        console.error('Bot turn error:', error);
        setIsProcessing(false);
        Alert.alert('Game Error', 'Bot encountered an error. Starting new game.');
        startNewGame();
      }
    }, 500);
  }, [currentWord, keyLetter, stats.turnsPlayed, gameHistory, startNewGame]);

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

  // Action bar configuration
  const getActionBarActions = (): ActionBarAction[] => {
    if (!gameStarted || currentPlayer !== 'human' || stats.gameComplete) {
      return [];
    }

    const canSubmit = currentWord.length >= 3 && selectedLetters.length > 0;
    
    return [
      {
        type: 'submit',
        onPress: submitHumanTurn,
        disabled: !canSubmit
      }
    ];
  };

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
        <Text style={styles.currentWordText}>Current Word: {currentWord || 'Select letters...'}</Text>
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

  const renderMainGameArea = () => {
    if (!gameStarted) return null;

    const keyLetterIndex = ALPHABET.indexOf(keyLetter);
    const wordHistory = gameHistory.map(turn => turn.word);
    
    return (
      <View style={styles.gameArea}>
        {/* Word Trail */}
        <View 
          style={styles.wordTrailContainer}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setWordAreaLayout({ x, y, width, height });
          }}
        >
          <WordTrail words={wordHistory} />
        </View>

        {/* Alphabet Grid */}
        <View style={styles.alphabetContainer}>
          <AlphabetGrid
            letters={ALPHABET}
            selectedIndices={selectedLetters}
            keyIndex={keyLetterIndex >= 0 ? keyLetterIndex : undefined}
            onLetterTap={handleLetterTap}
            onLetterDragToWord={handleLetterDragToWord}
            onLetterDragFromWordToGrid={handleLetterDragFromWordToGrid}
            wordAreaLayout={wordAreaLayout}
          />
        </View>

        {/* Action Bar */}
        <View style={styles.actionBarContainer}>
          <ActionBar actions={getActionBarActions()} />
        </View>
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
        {renderMainGameArea()}
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
  currentWordText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: 10,
    textAlign: 'center',
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
  gameArea: {
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
  wordTrailContainer: {
    marginBottom: 20,
    minHeight: 50,
    alignItems: 'center',
  },
  alphabetContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionBarContainer: {
    alignItems: 'center',
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