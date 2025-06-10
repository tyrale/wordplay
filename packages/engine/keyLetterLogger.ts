import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Key Letter Statistics Logger
 * Logs key letter generation across all games for frequency analysis
 */
export class KeyLetterLogger {
  private static logPath = join(process.cwd(), 'key-letter-stats.log');

  /**
   * Log a key letter generation event
   */
  static logKeyLetter(letter: string, gameStartTime: number, turnNumber: number): void {
    try {
      // Only log in Node.js environment (not browser)
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        const timestamp = new Date().toISOString();
        const gameId = `game_${gameStartTime}`;
        
        const logEntry = `${timestamp},${letter},${gameId},${turnNumber}\n`;
        
        // Create header if file doesn't exist
        if (!existsSync(this.logPath)) {
          const header = '# Key Letter Statistics Log\n# Format: TIMESTAMP,LETTER,GAME_ID,TURN_NUMBER\n# This file tracks every key letter generated to analyze frequency patterns\n# Started: ' + new Date().toISOString().split('T')[0] + '\n';
          writeFileSync(this.logPath, header);
        }
        
        // Append to log file
        appendFileSync(this.logPath, logEntry);
        
        console.log(`[STATS] Key letter logged: ${letter} (${this.logPath})`);
      }
    } catch (error) {
      // Silently fail if logging isn't available (e.g., in browser or restricted environment)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[STATS] Could not log key letter stats:', errorMessage);
    }
  }

  /**
   * Get the log file path
   */
  static getLogPath(): string {
    return this.logPath;
  }
} 