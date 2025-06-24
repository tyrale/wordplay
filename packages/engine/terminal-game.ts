/**
 * Terminal Game Interface
 * 
 * Interactive command-line interface for playing WordPlay against the bot.
 * This provides a way to test and validate the game engine logic and flow
 * before implementing the web UI.
 * 
 * Features:
 * - Human vs Bot gameplay
 * - Real-time game state display
 * - Move input validation
 * - Game progression tracking
 * - Performance monitoring
 */

import { createGameStateManagerWithDependencies, type LocalGameStateManagerWithDependencies, type GameConfig } from './gamestate';
import { createNodeAdapter } from '../../src/adapters/nodeAdapter';
import * as readline from 'readline';

// Terminal colors for better UX with turn-based theming
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Blue theme colors (for odd turns: 1, 3, 5, etc.)
  blueTheme: {
    primary: '\x1b[34m',      // Standard blue
    bright: '\x1b[94m',       // Bright blue
    light: '\x1b[36m',        // Cyan (light blue)
    dark: '\x1b[44m\x1b[37m', // Blue background with white text
    accent: '\x1b[96m',       // Bright cyan
    header: '\x1b[1m\x1b[34m' // Bold blue
  },
  
  // Green theme colors (for even turns: 2, 4, 6, etc.)
  greenTheme: {
    primary: '\x1b[32m',      // Standard green
    bright: '\x1b[92m',       // Bright green
    light: '\x1b[32m',        // Green
    dark: '\x1b[42m\x1b[30m', // Green background with black text
    accent: '\x1b[93m',       // Bright yellow (complements green)
    header: '\x1b[1m\x1b[32m' // Bold green
  }
};

interface TerminalGameOptions {
  maxTurns?: number;
  initialWord?: string;
  enableKeyLetters?: boolean;
  enableLockedLetters?: boolean;
}

export class TerminalGame {
  private gameManager: LocalGameStateManagerWithDependencies;
  private rl: readline.Interface;
  private gameConfig: GameConfig;

  constructor(options: TerminalGameOptions = {}) {
    this.gameConfig = {
      maxTurns: options.maxTurns || 10,
      initialWord: options.initialWord,
      allowBotPlayer: true,
      enableKeyLetters: options.enableKeyLetters ?? true,
      enableLockedLetters: options.enableLockedLetters ?? true
    };

    // Initialize with null, will be replaced in start() or manually in tests
    this.gameManager = null as any;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Note: We handle game ending in the main game loop instead of subscription
    // to avoid timing issues with readline interface
  }

  /**
   * Initialize game manager with given dependencies (for testing)
   */
  public initializeForTesting(dependencies: any): void {
    this.gameManager = createGameStateManagerWithDependencies(dependencies, this.gameConfig);
  }

  /**
   * Get the current turn's color theme based on turn number
   */
  private getTurnTheme(turnNumber: number) {
    return turnNumber % 2 === 1 ? colors.blueTheme : colors.greenTheme;
  }

  /**
   * Start the terminal game
   */
  public async start(): Promise<void> {
    this.showWelcome();
    this.showHelp();
    
    // Initialize Node.js adapter and create game manager (only if not already initialized for tests)
    if (!this.gameManager) {
      const nodeAdapter = await createNodeAdapter();
      const dependencies = nodeAdapter.getGameDependencies();
      this.gameManager = createGameStateManagerWithDependencies(dependencies, this.gameConfig);
    }
    
    this.gameManager.startGame();
    
    await this.gameLoop();
  }

  /**
   * Main game loop
   */
  private async gameLoop(): Promise<void> {
    while (true) {
      const state = this.gameManager.getState();
      
      if (state.gameStatus === 'finished') {
        this.handleGameEnd();
        break;
      }

      this.displayGameState();
      
      const currentPlayer = this.gameManager.getCurrentPlayer();
      if (!currentPlayer) {
        console.log(`${colors.red}Error: No current player found${colors.reset}`);
        break;
      }

      if (currentPlayer.isBot) {
        await this.handleBotTurn();
      } else {
        await this.handleHumanTurn();
      }
    }
  }

  /**
   * Handle bot turn
   */
  private async handleBotTurn(): Promise<void> {
    const state = this.gameManager.getState();
    const theme = this.getTurnTheme(state.currentTurn);
    
    console.log(`${theme.accent}🤖 Bot is thinking...${colors.reset}`);
    
    const startTime = Date.now();
    const botMove = await this.gameManager.makeBotMove();
    const duration = Date.now() - startTime;
    
    if (botMove) {
      if (botMove.reasoning.includes('PASS')) {
        console.log(`${theme.bright}Bot passed its turn${colors.reset} ${theme.primary}(${duration}ms)${colors.reset}`);
        console.log(`${theme.light}Reason: ${botMove.reasoning[0]}${colors.reset}`);
      } else {
        console.log(`${theme.bright}Bot played: ${theme.header}${botMove.word}${colors.reset} ${theme.primary}(+${botMove.score} points, ${duration}ms)${colors.reset}`);
        
        // Show bot scoring breakdown from the latest turn history
        const updatedState = this.gameManager.getState();
        const latestTurn = updatedState.turnHistory[updatedState.turnHistory.length - 1];
        if (latestTurn && latestTurn.scoringBreakdown) {
          this.showScoringBreakdown(latestTurn.scoringBreakdown);
        }
      }
    } else {
      console.log(`${colors.red}Bot couldn't find a valid move${colors.reset}`);
    }
    
    // Small delay for readability
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Handle human turn
   */
  private async handleHumanTurn(): Promise<void> {
    const state = this.gameManager.getState();
    const theme = this.getTurnTheme(state.currentTurn);
    
    const input = await this.promptUser(`${theme.header}Your turn! Enter a word: ${colors.reset}`);
    
    const command = input.trim().toUpperCase();
    
    // Handle special commands
    if (command === 'QUIT' || command === 'EXIT') {
      console.log(`${colors.yellow}Thanks for playing!${colors.reset}`);
      process.exit(0);
    }
    
    if (command === 'HELP') {
      this.showHelp();
      return;
    }
    
    if (command === 'STATE') {
      this.displayDetailedState();
      return;
    }
    
    if (command === 'DEBUG') {
      console.log(`${colors.yellow}[DEBUG] Testing LOCK and CLOCK validation...${colors.reset}`);
      
      // Test the exact words from the bug report
      const testWords = ['LOCK', 'CLOCK'];
      const currentState = this.gameManager.getState();
      
      console.log(`${colors.yellow}[DEBUG] Current state:${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] - Current word: ${currentState.currentWord}${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] - All used words: [${currentState.usedWords.join(', ')}]${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] - Recent words (last 5): [${currentState.usedWords.slice(-5).join(', ')}]${colors.reset}`);
      
      testWords.forEach(word => {
        console.log(`${colors.yellow}[DEBUG] Testing: ${word}${colors.reset}`);
        const attempt = this.gameManager.attemptMove(word);
        console.log(`${colors.yellow}[DEBUG] - Valid: ${attempt.isValid}${colors.reset}`);
        console.log(`${colors.yellow}[DEBUG] - Reason: ${attempt.validationResult.reason}${colors.reset}`);
        console.log(`${colors.yellow}[DEBUG] - User message: ${attempt.validationResult.userMessage}${colors.reset}`);
        console.log(`${colors.yellow}[DEBUG] - In used words: ${currentState.usedWords.includes(word)}${colors.reset}`);
      });
      return;
    }
    
    if (command === 'PASS') {
      const success = this.gameManager.passTurn();
      if (success) {
        console.log(`${theme.bright}You passed your turn${colors.reset}`);
      } else {
        console.log(`${colors.red}Unable to pass turn${colors.reset}`);
      }
      return;
    }
    
    // Handle word input
    if (command.length === 0) {
      console.log(`${colors.red}Please enter a word${colors.reset}`);
      return;
    }
    
    const moveAttempt = this.gameManager.attemptMove(command);
    
    // DEBUG: Add detailed validation debugging for the reported issue
    if (!moveAttempt.isValid) {
      const currentState = this.gameManager.getState();
      console.log(`${colors.yellow}[DEBUG] Validation failed for: ${command}${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] Current word: ${currentState.currentWord}${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] All used words: [${currentState.usedWords.join(', ')}]${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] Is '${command}' in used words? ${currentState.usedWords.includes(command)}${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] Validation reason: ${moveAttempt.validationResult.reason}${colors.reset}`);
      console.log(`${colors.yellow}[DEBUG] User message: ${moveAttempt.validationResult.userMessage}${colors.reset}`);
    }
    
    if (moveAttempt.canApply) {
      const success = this.gameManager.applyMove(moveAttempt);
      if (success) {
        console.log(`${theme.bright}Valid move! ${theme.header}${moveAttempt.newWord}${colors.reset} ${theme.primary}(+${moveAttempt.scoringResult?.totalScore} points)${colors.reset}`);
        if (moveAttempt.scoringResult) {
          this.showScoringBreakdown(moveAttempt.scoringResult);
        }
      } else {
        console.log(`${colors.red}Failed to apply move${colors.reset}`);
      }
    } else {
      // Use the user-friendly message if available, otherwise fall back to the reason
      const errorMessage = moveAttempt.validationResult.userMessage || moveAttempt.reason;
      
      // Special handling for "was played" errors to make them more helpful
      if (moveAttempt.validationResult.userMessage === 'was played') {
        const currentState = this.gameManager.getState();
        const hiddenCount = Math.max(0, currentState.usedWords.length - 5);
        if (hiddenCount > 0) {
          console.log(`${colors.red}Invalid word: was played${colors.reset}`);
          console.log(`${colors.yellow}💡 "${command}" was used earlier (${hiddenCount} words not shown). Use 'state' to see all words.${colors.reset}`);
        } else {
          console.log(`${colors.red}Invalid word: ${errorMessage}${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}Invalid word: ${errorMessage}${colors.reset}`);
      }
    }
  }

  /**
   * Display current game state
   */
  private displayGameState(): void {
    const state = this.gameManager.getState();
    const theme = this.getTurnTheme(state.currentTurn);
    
    console.log('\n' + '='.repeat(60));
    console.log(`${theme.header}WORDPLAY - Turn ${state.currentTurn}/${state.maxTurns}${colors.reset}`);
    console.log('='.repeat(60));
    
    // Current word with locked letters highlighted
    const highlightedWord = this.highlightLockedLetters(state.currentWord, state.lockedKeyLetters, theme);
    console.log(`${theme.primary}Current Word: ${highlightedWord}${colors.reset}`);
    
    // Key and locked letters
    if (state.keyLetters.length > 0) {
      console.log(`${theme.accent}Key Letters (bonus +1 each): ${state.keyLetters.join(', ')}${colors.reset}`);
    }
    if (state.lockedLetters.length > 0) {
      console.log(`${theme.primary}Locked Letters: ${state.lockedLetters.join(', ')}${colors.reset}`);
    }
    
    // Show locked key letters explanation if any exist
    if (state.lockedKeyLetters.length > 0) {
      console.log(`${theme.light}📌 Locked letters (cannot remove): ${state.lockedKeyLetters.join(', ')}${colors.reset}`);
    }
    
    // Show recently used words
    if (state.usedWords.length > 1) {
      const recentWords = state.usedWords.slice(-5).join(' → ');
      const hiddenCount = Math.max(0, state.usedWords.length - 5);
      
      if (hiddenCount > 0) {
        console.log(`${theme.light}Recent words (+${hiddenCount} more): ${recentWords}${colors.reset}`);
        console.log(`${theme.accent}💡 Use 'state' command to see all ${state.usedWords.length} used words${colors.reset}`);
      } else {
        console.log(`${theme.light}Recent words: ${recentWords}${colors.reset}`);
      }
    }
    
    // Player scores
    console.log('\n' + theme.header + 'SCORES:' + colors.reset);
    state.players.forEach(player => {
      const indicator = player.isCurrentPlayer ? '→' : ' ';
      const playerColor = player.isBot ? theme.light : theme.bright;
      const currentMarker = player.isCurrentPlayer ? theme.accent + ' (CURRENT)' + colors.reset : '';
      console.log(`${indicator} ${playerColor}${player.name}: ${player.score} points${currentMarker}${colors.reset}`);
    });
    
    console.log('');
  }

  /**
   * Highlight locked key letters within the current word using inverted colors
   */
  private highlightLockedLetters(word: string, lockedKeyLetters: string[], theme: typeof colors.blueTheme): string {
    if (lockedKeyLetters.length === 0) {
      return `${theme.header}${word}`;
    }
    
    let highlightedWord = '';
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      if (lockedKeyLetters.includes(letter.toUpperCase())) {
        // Use inverted colors for locked letters (dark background with white text)
        highlightedWord += `${theme.dark}${letter}${colors.reset}${theme.header}`;
      } else {
        highlightedWord += letter;
      }
    }
    
    return `${theme.header}${highlightedWord}`;
  }

  /**
   * Display detailed game state
   */
  private displayDetailedState(): void {
    const state = this.gameManager.getState();
    const stats = this.gameManager.getGameStats();
    const theme = this.getTurnTheme(state.currentTurn);
    
    console.log('\n' + theme.header + 'DETAILED GAME STATE:' + colors.reset);
    console.log(`${theme.primary}Game Status: ${state.gameStatus}${colors.reset}`);
    console.log(`${theme.primary}Total Moves: ${state.totalMoves}${colors.reset}`);
    console.log(`${theme.primary}Game Duration: ${Math.round(stats.duration / 1000)}s${colors.reset}`);
    console.log(`${theme.primary}Average Score: ${stats.averageScore.toFixed(1)}${colors.reset}`);
    
    // Current word with highlighting
    const highlightedWord = this.highlightLockedLetters(state.currentWord, state.lockedKeyLetters, theme);
    console.log(`\n${theme.header}CURRENT WORD: ${highlightedWord}${colors.reset}`);
    
    if (state.usedWords.length > 0) {
      console.log('\n' + theme.header + 'ALL USED WORDS:' + colors.reset);
      console.log(`${theme.light}${state.usedWords.join(' → ')}${colors.reset}`);
    }
    
    if (state.keyLetters.length > 0) {
      console.log('\n' + theme.header + 'CURRENT KEY LETTERS:' + colors.reset);
      console.log(`${theme.accent}${state.keyLetters.join(', ')} (each worth +1 bonus point)${colors.reset}`);
    }
    
    // Show locked key letters in detailed state
    if (state.lockedKeyLetters.length > 0) {
      console.log('\n' + theme.header + 'LOCKED KEY LETTERS:' + colors.reset);
      console.log(`${theme.light}📌 ${state.lockedKeyLetters.join(', ')} (highlighted in current word above, cannot be removed this turn)${colors.reset}`);
    }
    
    if (state.turnHistory.length > 0) {
      console.log('\n' + theme.header + 'RECENT MOVES:' + colors.reset);
      const recentMoves = state.turnHistory.slice(-5);
      recentMoves.forEach(turn => {
        const playerName = state.players.find(p => p.id === turn.playerId)?.name || 'Unknown';
        const turnTheme = this.getTurnTheme(turn.turnNumber);
        console.log(`${turnTheme.primary}Turn ${turn.turnNumber}: ${playerName} played ${turn.previousWord} → ${turn.newWord} (+${turn.score})${colors.reset}`);
      });
    }
  }

  /**
   * Show scoring breakdown using action icons format
   */
  private showScoringBreakdown(scoring: { breakdown: Record<string, number>; keyLettersUsed: string[] }): void {
    const state = this.gameManager.getState();
    const theme = this.getTurnTheme(state.currentTurn);
    const breakdown = scoring.breakdown;
    const actions = [];
    
    // Build action icons based on what actions were taken
    if (breakdown.addLetterPoints > 0) {
      actions.push('+');
    }
    if (breakdown.removeLetterPoints > 0) {
      actions.push('-');
    }
    if (breakdown.movePoints > 0) {
      actions.push('~'); // Using ~ for rearrangement/move
    }
    
    // Calculate base score (non-key-letter points)
    const baseScore = (breakdown.addLetterPoints || 0) + 
                     (breakdown.removeLetterPoints || 0) + 
                     (breakdown.movePoints || 0);
    
    // Build the scoring display line
    if (actions.length > 0) {
      let scoreLine = actions.join(' | ') + ` ${baseScore}`;
      
      // Add key letter bonus if any
      if (breakdown.keyLetterUsagePoints > 0) {
        scoreLine += ` +${breakdown.keyLetterUsagePoints}`;
      }
      
      console.log(`${theme.light}Scoring: ${scoreLine}${colors.reset}`);
      
      // Show which key letters were used
      if (scoring.keyLettersUsed.length > 0) {
        console.log(`${theme.accent}Key letters used: ${scoring.keyLettersUsed.join(', ')}${colors.reset}`);
      }
    }
  }

  /**
   * Handle game end
   */
  private handleGameEnd(): void {
    const state = this.gameManager.getState();
    const stats = this.gameManager.getGameStats();
    
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}${colors.green}GAME OVER!${colors.reset}`);
    console.log('='.repeat(60));
    
    if (state.winner) {
      const winnerColor = state.winner.isBot ? colors.cyan : colors.green;
      console.log(`${colors.bright}🏆 Winner: ${winnerColor}${state.winner.name}${colors.reset} ${colors.bright}(${state.winner.score} points)${colors.reset}`);
    } else {
      console.log(`${colors.yellow}It's a tie!${colors.reset}`);
    }
    
    console.log('\n' + colors.bright + 'FINAL SCORES:' + colors.reset);
    const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
    sortedPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : '🥈';
      const playerColor = player.isBot ? colors.cyan : colors.green;
      console.log(`${medal} ${playerColor}${player.name}: ${player.score} points${colors.reset}`);
    });
    
    console.log('\n' + colors.bright + 'GAME STATISTICS:' + colors.reset);
    console.log(`Duration: ${Math.round(stats.duration / 1000)}s`);
    console.log(`Total Moves: ${stats.totalMoves}`);
    console.log(`Average Score per Move: ${stats.averageScore.toFixed(1)}`);
    
    stats.playerStats.forEach(playerStat => {
      const player = state.players.find(p => p.id === playerStat.id);
      const playerColor = player?.isBot ? colors.cyan : colors.green;
      console.log(`${playerColor}${playerStat.name}${colors.reset}: ${playerStat.moveCount} moves, ${playerStat.averageScorePerMove.toFixed(1)} avg/move`);
    });
    
    if (state.turnHistory.length > 0) {
      console.log('\n' + colors.bright + 'MOVE HISTORY:' + colors.reset);
      state.turnHistory.forEach(turn => {
        const player = state.players.find(p => p.id === turn.playerId);
        const turnTheme = this.getTurnTheme(turn.turnNumber);
        console.log(`${turnTheme.primary}Turn ${turn.turnNumber}: ${player?.name}${colors.reset} ${turn.previousWord} → ${turn.newWord} (+${turn.score})`);
      });
    }
    
    this.rl.close();
  }

  /**
   * Show welcome message
   */
  private showWelcome(): void {
    console.clear();
    console.log(colors.bright + colors.blue);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                        WORDPLAY                          ║');
    console.log('║                    Terminal Edition                      ║');
    console.log('║                                                          ║');
    console.log('║              Human vs Bot Word Challenge                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
    console.log(`${colors.green}Welcome to WordPlay! Transform words by adding, removing, or rearranging letters.${colors.reset}`);
    console.log(`${colors.green}Score points for each transformation and try to beat the bot!${colors.reset}`);
    console.log(`${colors.yellow}Each game starts with a random 4-letter word and generates key letters automatically!${colors.reset}\n`);
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(colors.bright + 'HOW TO PLAY:' + colors.reset);
    console.log('• Transform the current word by adding, removing, or rearranging letters');
    console.log('• Each transformation scores points: +1 for add/remove/rearrange');
    console.log('• Key letters are automatically generated and give bonus points (+1 when used)');
    console.log('• Key letters used successfully become LOCKED for the next player (cannot remove)');
    console.log('• Must be valid dictionary words with max ±1 letter change per turn');
    console.log('• No word can be played twice in the same game');
    console.log('');
    console.log(colors.bright + 'SCORING DISPLAY:' + colors.reset);
    console.log('• + = letter addition, - = letter removal, ~ = rearrangement');
    console.log('• Example: "+ | ~ 2 +1" means add + rearrange (2 pts) + key letter bonus (1 pt)');
    console.log('');
    console.log(colors.bright + 'COMMANDS:' + colors.reset);
    console.log('• [word]        - Make a move with the word');
    console.log('• state         - Show detailed game state');
    console.log('• debug         - Test LOCK and CLOCK validation (for bug investigation)');
    console.log('• pass          - Skip your turn (clears locked letters)');
    console.log('• help          - Show this help message');
    console.log('• quit          - Exit the game');
    console.log('');
  }

  /**
   * Prompt user for input
   */
  private promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

/**
 * Start a terminal game with default settings
 */
export async function startTerminalGame(options?: TerminalGameOptions): Promise<void> {
  const game = new TerminalGame(options);
  await game.start();
}

/**
 * Quick start function for testing
 */
export async function quickGame(): Promise<void> {
  await startTerminalGame({
    maxTurns: 5,
    enableKeyLetters: true,
    enableLockedLetters: false
  });
}

// If this file is run directly, start a game
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting WordPlay Terminal Game...');
  startTerminalGame().catch(console.error);
} 