/**
 * Key Letter Statistics Logger
 * Logs key letter generation across all games for frequency analysis
 * Only works in Node.js environments, gracefully fails in browsers
 */
export class KeyLetterLogger {
  /**
   * Log a key letter generation event
   */
  static logKeyLetter(letter: string, gameStartTime: number, turnNumber: number): void {
    try {
      // Only log in Node.js environment (not browser)
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        // Check if we're in a Node.js environment by testing for require
        if (typeof require !== 'undefined') {
          this.logKeyLetterSync(letter, gameStartTime, turnNumber);
        } else {
          // Use dynamic imports as fallback
          this.logKeyLetterAsync(letter, gameStartTime, turnNumber);
        }
      }
    } catch (error) {
      // Silently fail if logging isn't available (e.g., in browser or restricted environment)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[STATS] Could not log key letter stats:', errorMessage);
    }
  }

  /**
   * Synchronous Node.js logging (CommonJS)
   */
  private static logKeyLetterSync(letter: string, gameStartTime: number, turnNumber: number): void {
    try {
      // Use eval to avoid bundler issues
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      
      const logPath = path.join(process.cwd(), 'key-letter-stats.log');
      const timestamp = new Date().toISOString();
      const gameId = `game_${gameStartTime}`;
      
      const logEntry = `${timestamp},${letter},${gameId},${turnNumber}\n`;
      
      // Create header if file doesn't exist
      if (!fs.existsSync(logPath)) {
        const header = '# Key Letter Statistics Log\n# Format: TIMESTAMP,LETTER,GAME_ID,TURN_NUMBER\n# This file tracks every key letter generated to analyze frequency patterns\n# Started: ' + new Date().toISOString().split('T')[0] + '\n';
        fs.writeFileSync(logPath, header);
      }
      
      // Append to log file
      fs.appendFileSync(logPath, logEntry);
      
      console.log(`[STATS] Key letter logged: ${letter} (${logPath})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[STATS] Sync logging failed:', errorMessage);
    }
  }

  /**
   * Asynchronous Node.js logging (ES modules)
   * Note: May not complete in short-lived processes due to async nature
   */
  private static logKeyLetterAsync(letter: string, gameStartTime: number, turnNumber: number): void {
    // Use dynamic import with immediate execution
    import('fs').then(fs => {
      import('path').then(path => {
        try {
          const logPath = path.join(process.cwd(), 'key-letter-stats.log');
          const timestamp = new Date().toISOString();
          const gameId = `game_${gameStartTime}`;
          
          const logEntry = `${timestamp},${letter},${gameId},${turnNumber}\n`;
          
          // Create header if file doesn't exist
          if (!fs.existsSync(logPath)) {
            const header = '# Key Letter Statistics Log\n# Format: TIMESTAMP,LETTER,GAME_ID,TURN_NUMBER\n# This file tracks every key letter generated to analyze frequency patterns\n# Started: ' + new Date().toISOString().split('T')[0] + '\n';
            fs.writeFileSync(logPath, header);
          }
          
          // Append to log file
          fs.appendFileSync(logPath, logEntry);
          
          console.log(`[STATS] Key letter logged: ${letter} (${logPath})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('[STATS] Async logging failed:', errorMessage);
        }
      }).catch(err => console.warn('[STATS] Path import failed:', err.message));
    }).catch(err => console.warn('[STATS] FS import failed:', err.message));
  }

  /**
   * Get the log file path (Node.js only)
   */
  static async getLogPath(): Promise<string | null> {
    try {
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        const { join } = await import('path');
        return join(process.cwd(), 'key-letter-stats.log');
      }
      return null;
    } catch {
      return null;
    }
  }
} 