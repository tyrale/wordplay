/**
 * Local GameState Manager
 *
 * This module provides comprehensive game state management for the WordPlay game,
 * integrating word validation, scoring, and bot AI into a cohesive game experience.
 *
 * Key Features:
 * - Complete game state management (word, key letters, locked letters)
 * - Word validation and scoring integration
 * - Bot AI integration for single-player games
 * - Letter movement and rearrangement system
 * - Turn-based game flow with history tracking
 * - Performance optimized for web compatibility
 * - Observable state changes for UI integration
 */
import { validateWord } from './dictionary';
import { calculateScore, getScoreForMove } from './scoring';
import { generateBotMove } from './bot';
/**
 * Local GameState Manager Class
 * Manages all game state and integrates with validation, scoring, and bot AI
 */
export class LocalGameStateManager {
    constructor(config = {}) {
        this.listeners = [];
        this.state = this.initializeGameState(config);
    }
    /**
     * Initialize a new game state with default values
     */
    initializeGameState(config) {
        const defaultConfig = {
            maxTurns: 10,
            initialWord: 'CAT',
            allowBotPlayer: true,
            enableKeyLetters: true,
            enableLockedLetters: true,
            ...config
        };
        const humanPlayer = {
            id: 'human',
            name: 'Player',
            isBot: false,
            score: 0,
            isCurrentPlayer: true
        };
        const players = [humanPlayer];
        // Add bot player if enabled
        if (defaultConfig.allowBotPlayer) {
            const botPlayer = {
                id: 'bot',
                name: 'Bot AI',
                isBot: true,
                score: 0,
                isCurrentPlayer: false
            };
            players.push(botPlayer);
        }
        const now = Date.now();
        return {
            currentWord: defaultConfig.initialWord.toUpperCase(),
            keyLetters: [],
            lockedLetters: [],
            players,
            currentTurn: 1,
            maxTurns: defaultConfig.maxTurns,
            gameStatus: 'waiting',
            winner: null,
            turnHistory: [],
            totalMoves: 0,
            config: defaultConfig,
            gameStartTime: now,
            lastMoveTime: now
        };
    }
    /**
     * Get the current game state (read-only copy)
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get the current player
     */
    getCurrentPlayer() {
        return this.state.players.find(p => p.isCurrentPlayer) || null;
    }
    /**
     * Get the other player (non-current)
     */
    getOtherPlayer() {
        return this.state.players.find(p => !p.isCurrentPlayer) || null;
    }
    /**
     * Start a new game
     */
    startGame() {
        if (this.state.gameStatus !== 'waiting') {
            throw new Error('Game has already started');
        }
        this.state.gameStatus = 'playing';
        this.state.gameStartTime = Date.now();
        this.state.lastMoveTime = Date.now();
        this.notifyListeners({
            type: 'game_finished',
            data: { status: 'playing' },
            timestamp: Date.now()
        });
    }
    /**
     * Attempt to make a move with the given word
     */
    attemptMove(newWord) {
        if (this.state.gameStatus !== 'playing') {
            return {
                newWord,
                isValid: false,
                validationResult: { isValid: false, reason: 'Game is not in progress', word: newWord },
                scoringResult: null,
                canApply: false,
                reason: 'Game is not in progress'
            };
        }
        const normalizedWord = newWord.trim().toUpperCase();
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer) {
            return {
                newWord: normalizedWord,
                isValid: false,
                validationResult: { isValid: false, reason: 'No current player', word: normalizedWord },
                scoringResult: null,
                canApply: false,
                reason: 'No current player found'
            };
        }
        // Validate the word using the dictionary service
        const validationResult = validateWord(normalizedWord, {
            isBot: currentPlayer.isBot,
            previousWord: this.state.currentWord,
            checkLength: true
        });
        if (!validationResult.isValid) {
            return {
                newWord: normalizedWord,
                isValid: false,
                validationResult,
                scoringResult: null,
                canApply: false,
                reason: validationResult.reason
            };
        }
        // Calculate scoring
        const scoringResult = calculateScore(this.state.currentWord, normalizedWord, {
            keyLetters: this.state.keyLetters
        });
        return {
            newWord: normalizedWord,
            isValid: true,
            validationResult,
            scoringResult,
            canApply: true
        };
    }
    /**
     * Apply a move to the game state
     */
    applyMove(moveAttempt) {
        if (!moveAttempt.canApply || !moveAttempt.scoringResult) {
            return false;
        }
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer) {
            return false;
        }
        const previousWord = this.state.currentWord;
        // Update game state
        this.state.currentWord = moveAttempt.newWord;
        this.state.lastMoveTime = Date.now();
        this.state.totalMoves++;
        // Update player score
        currentPlayer.score += moveAttempt.scoringResult.totalScore;
        // Add to turn history
        const turnRecord = {
            turnNumber: this.state.currentTurn,
            playerId: currentPlayer.id,
            previousWord,
            newWord: moveAttempt.newWord,
            score: moveAttempt.scoringResult.totalScore,
            scoringBreakdown: moveAttempt.scoringResult,
            timestamp: Date.now()
        };
        this.state.turnHistory.push(turnRecord);
        // Update key letters based on scoring result
        if (this.state.config.enableKeyLetters && moveAttempt.scoringResult.keyLettersUsed.length > 0) {
            // Remove used key letters and potentially add new ones
            moveAttempt.scoringResult.keyLettersUsed.forEach(usedLetter => {
                const index = this.state.keyLetters.indexOf(usedLetter);
                if (index > -1) {
                    this.state.keyLetters.splice(index, 1);
                }
            });
        }
        // Notify listeners of word change
        this.notifyListeners({
            type: 'word_changed',
            data: { previousWord, newWord: moveAttempt.newWord, score: moveAttempt.scoringResult.totalScore },
            timestamp: Date.now()
        });
        // Switch to next player
        this.switchToNextPlayer();
        // Check if game is finished
        if (this.state.currentTurn > this.state.maxTurns) {
            this.finishGame();
        }
        return true;
    }
    /**
     * Make a bot move (if current player is bot)
     */
    async makeBotMove() {
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer || !currentPlayer.isBot) {
            return null;
        }
        if (this.state.gameStatus !== 'playing') {
            return null;
        }
        try {
            // Generate bot move
            const botResult = generateBotMove(this.state.currentWord, {
                keyLetters: this.state.keyLetters,
                maxCandidates: 500 // Reasonable limit for responsive gameplay
            });
            if (!botResult.move) {
                console.warn('Bot could not generate a valid move');
                return null;
            }
            // Attempt and apply the bot's move
            const moveAttempt = this.attemptMove(botResult.move.word);
            if (moveAttempt.canApply) {
                const success = this.applyMove(moveAttempt);
                if (success) {
                    return botResult.move;
                }
            }
            return null;
        }
        catch (error) {
            console.error('Bot move generation failed:', error);
            return null;
        }
    }
    /**
     * Switch to the next player
     */
    switchToNextPlayer() {
        // Find current player before switching
        const currentPlayerIndex = this.state.players.findIndex(p => p.isCurrentPlayer);
        // Mark all players as not current
        this.state.players.forEach(player => {
            player.isCurrentPlayer = false;
        });
        // Calculate next player index
        const nextPlayerIndex = (currentPlayerIndex + 1) % this.state.players.length;
        this.state.players[nextPlayerIndex].isCurrentPlayer = true;
        this.state.currentTurn++;
        this.notifyListeners({
            type: 'turn_completed',
            data: {
                currentTurn: this.state.currentTurn,
                currentPlayer: this.state.players[nextPlayerIndex]
            },
            timestamp: Date.now()
        });
    }
    /**
     * Finish the game and determine winner
     */
    finishGame() {
        this.state.gameStatus = 'finished';
        // Determine winner by highest score
        const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
        this.state.winner = sortedPlayers[0];
        this.notifyListeners({
            type: 'game_finished',
            data: {
                winner: this.state.winner,
                finalScores: this.state.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
            },
            timestamp: Date.now()
        });
    }
    /**
     * Key letters management
     */
    addKeyLetter(letter) {
        const normalizedLetter = letter.toUpperCase();
        if (!this.state.config.enableKeyLetters) {
            return;
        }
        if (!this.state.keyLetters.includes(normalizedLetter)) {
            this.state.keyLetters.push(normalizedLetter);
            this.notifyListeners({
                type: 'letters_updated',
                data: { type: 'key_added', letter: normalizedLetter, keyLetters: [...this.state.keyLetters] },
                timestamp: Date.now()
            });
        }
    }
    removeKeyLetter(letter) {
        const normalizedLetter = letter.toUpperCase();
        const index = this.state.keyLetters.indexOf(normalizedLetter);
        if (index > -1) {
            this.state.keyLetters.splice(index, 1);
            this.notifyListeners({
                type: 'letters_updated',
                data: { type: 'key_removed', letter: normalizedLetter, keyLetters: [...this.state.keyLetters] },
                timestamp: Date.now()
            });
        }
    }
    /**
     * Locked letters management
     */
    addLockedLetter(letter) {
        const normalizedLetter = letter.toUpperCase();
        if (!this.state.config.enableLockedLetters) {
            return;
        }
        if (!this.state.lockedLetters.includes(normalizedLetter)) {
            this.state.lockedLetters.push(normalizedLetter);
            this.notifyListeners({
                type: 'letters_updated',
                data: { type: 'locked_added', letter: normalizedLetter, lockedLetters: [...this.state.lockedLetters] },
                timestamp: Date.now()
            });
        }
    }
    removeLockedLetter(letter) {
        const normalizedLetter = letter.toUpperCase();
        const index = this.state.lockedLetters.indexOf(normalizedLetter);
        if (index > -1) {
            this.state.lockedLetters.splice(index, 1);
            this.notifyListeners({
                type: 'letters_updated',
                data: { type: 'locked_removed', letter: normalizedLetter, lockedLetters: [...this.state.lockedLetters] },
                timestamp: Date.now()
            });
        }
    }
    /**
     * Word management with validation
     */
    setWord(word) {
        const normalizedWord = word.trim().toUpperCase();
        // Basic validation
        if (!normalizedWord || !/^[A-Z]+$/.test(normalizedWord)) {
            return false;
        }
        this.state.currentWord = normalizedWord;
        this.notifyListeners({
            type: 'word_changed',
            data: { newWord: normalizedWord, source: 'manual' },
            timestamp: Date.now()
        });
        return true;
    }
    /**
     * Reset game to initial state
     */
    resetGame() {
        const newState = this.initializeGameState(this.state.config);
        this.state = newState;
        this.notifyListeners({
            type: 'game_finished',
            data: { type: 'reset' },
            timestamp: Date.now()
        });
    }
    /**
     * Get game statistics
     */
    getGameStats() {
        const duration = Date.now() - this.state.gameStartTime;
        const totalScore = this.state.players.reduce((sum, player) => sum + player.score, 0);
        const averageScore = this.state.totalMoves > 0 ? totalScore / this.state.totalMoves : 0;
        const playerStats = this.state.players.map(player => {
            const playerMoves = this.state.turnHistory.filter(turn => turn.playerId === player.id);
            const moveCount = playerMoves.length;
            const averageScorePerMove = moveCount > 0 ? player.score / moveCount : 0;
            return {
                id: player.id,
                name: player.name,
                score: player.score,
                moveCount,
                averageScorePerMove
            };
        });
        return {
            duration,
            totalMoves: this.state.totalMoves,
            averageScore,
            playerStats
        };
    }
    /**
     * Event system for UI integration
     */
    subscribe(listener) {
        this.listeners.push(listener);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    notifyListeners(update) {
        this.listeners.forEach(listener => {
            try {
                listener(update);
            }
            catch (error) {
                console.error('GameState listener error:', error);
            }
        });
    }
    /**
     * Performance test helper
     */
    performanceTest(operations = 1000) {
        const startTime = performance.now();
        for (let i = 0; i < operations; i++) {
            // Simulate common operations
            this.getState();
            this.getCurrentPlayer();
            this.attemptMove(`TEST${i % 100}`);
            if (i % 100 === 0) {
                this.addKeyLetter('A');
                this.removeKeyLetter('A');
            }
        }
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const averageTime = totalTime / operations;
        return { averageTime, totalTime };
    }
}
/**
 * Factory function for creating game state managers
 */
export function createGameStateManager(config) {
    return new LocalGameStateManager(config);
}
/**
 * Helper function for quick move scoring
 */
export function quickScoreMove(fromWord, toWord, keyLetters = []) {
    return getScoreForMove(fromWord, toWord, keyLetters);
}
/**
 * Helper function for move validation
 */
export function quickValidateMove(word, isBot = false, previousWord) {
    const result = validateWord(word, { isBot, previousWord, checkLength: true });
    return result.isValid;
}
