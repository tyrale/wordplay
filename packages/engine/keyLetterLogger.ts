/**
 * Universal Key Letter Statistics Logger
 * Logs ALL key letter generation to the same central log file
 * Browser games buffer in localStorage and sync when possible
 */
export interface KeyLetterLogEntry {
  timestamp: string;
  letter: string;
  gameId: string;
  turnNumber: number;
  platform: string;
}

export class KeyLetterLogger {
  private static logFilePath = 'key-letter-stats.log';

  /**
   * Log a key letter generation event (universal - all platforms write to same file)
   */
  static async logKeyLetter(
    letter: string,
    gameId: string,
    turnNumber: number
  ): Promise<void> {
    const entry: KeyLetterLogEntry = {
      timestamp: new Date().toISOString(),
      letter: letter.toUpperCase(),
      gameId,
      turnNumber,
      platform: this.detectPlatform()
    };

    // Try to write to central log file
    if (this.isNodeEnvironment()) {
      // Node.js environment - write directly to file
      await this.writeToFile(entry);
    } else {
      // Browser environment - send to logging endpoint
      await this.sendToEndpoint(entry);
    }
  }

  private static isNodeEnvironment(): boolean {
    return typeof window === 'undefined' && typeof process !== 'undefined';
  }

  private static detectPlatform(): string {
    if (this.isNodeEnvironment()) {
      return 'nodejs';
    }
    
    // Browser detection
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/mobile|android|iphone|ipad/.test(userAgent)) {
        return 'mobile_browser';
      }
      return 'browser';
    }
    
    return 'unknown';
  }

  private static async writeToFile(entry: KeyLetterLogEntry): Promise<void> {
    try {
      // Dynamic import for Node.js file system operations
      const fs = await import('fs');
      const csvLine = `${entry.timestamp},${entry.letter},${entry.gameId},${entry.turnNumber},${entry.platform}\n`;
      
      // Append to log file
      fs.writeFileSync(this.logFilePath, csvLine, { flag: 'a' });
    } catch (error) {
      console.warn('Failed to write key letter log:', error);
    }
  }

  private static async sendToEndpoint(entry: KeyLetterLogEntry): Promise<void> {
    try {
      // Try to send to local logging endpoint
      const response = await fetch('http://localhost:3001/log-key-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // If endpoint fails, fall back to console logging
      console.log('Key Letter Log:', entry);
      console.warn('Failed to send to logging endpoint, logged to console instead:', error);
    }
  }

  /**
   * Get the central log file path (Node.js only)
   */
  static async getLogPath(): Promise<string | null> {
    try {
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        const { join } = await import('path');
        return join(process.cwd(), this.logFilePath);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get combined statistics from file + browser buffer
   */
  static async getCombinedStats(): Promise<any> {
    const stats = {
      fileEntries: 0,
      browserEntries: 0,
      totalEntries: 0,
      letterFrequency: {} as { [key: string]: number },
      platformBreakdown: {} as { [key: string]: number },
      needsSync: false
    };

    // Try to read file data (Node.js only)
    if (this.isNodeEnvironment()) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const logPath = path.join(process.cwd(), this.logFilePath);
        
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#') && line.includes(','));
          
          stats.fileEntries = lines.length;
          
          lines.forEach(line => {
            const [timestamp, letter, gameId, turnNumber, platform] = line.split(',');
            if (letter && letter.trim()) {
              const cleanLetter = letter.trim();
              const cleanPlatform = platform?.trim() || 'unknown';
              stats.letterFrequency[cleanLetter] = (stats.letterFrequency[cleanLetter] || 0) + 1;
              stats.platformBreakdown[cleanPlatform] = (stats.platformBreakdown[cleanPlatform] || 0) + 1;
            }
          });
        }
      } catch (error) {
        // File reading failed
      }
    }

    stats.totalEntries = stats.fileEntries;
    return stats;
  }
} 