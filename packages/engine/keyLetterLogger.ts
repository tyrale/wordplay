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
  private static logFilePath = 'key-letter-counts.txt';

  /**
   * Log a key letter generation event (universal - all platforms write to same file)
   */
  static async logKeyLetter(
    letter: string,
    gameId: string,
    turnNumber: number
  ): Promise<void> {
    const upperLetter = letter.toUpperCase();

    // Try to update the count file
    if (this.isNodeEnvironment()) {
      // Node.js environment - update file directly
      await this.updateCountFile(upperLetter);
    } else {
      // Browser environment - send to logging endpoint
      await this.sendToEndpoint(upperLetter);
    }
  }

  private static isNodeEnvironment(): boolean {
    return typeof window === 'undefined' && typeof process !== 'undefined';
  }

  private static async updateCountFile(letter: string): Promise<void> {
    try {
      // Dynamic import for Node.js file system operations
      const fs = await import('fs');
      
      // Read current counts
      const counts = await this.readCounts();
      
      // Increment the count for this letter
      counts[letter] = (counts[letter] || 0) + 1;
      
      // Write back to file
      await this.writeCounts(counts);
    } catch (error) {
      console.warn('Failed to update key letter count:', error);
    }
  }

  private static async sendToEndpoint(letter: string): Promise<void> {
    try {
      // Try to send to local logging endpoint
      const response = await fetch('http://localhost:3001/log-key-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ letter }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // If endpoint fails, fall back to console logging
      console.log('Key Letter Count:', letter);
      console.warn('Failed to send to logging endpoint, logged to console instead:', error);
    }
  }

  private static async readCounts(): Promise<{ [key: string]: number }> {
    try {
      const fs = await import('fs');
      
      if (!fs.existsSync(this.logFilePath)) {
        return {};
      }
      
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const counts: { [key: string]: number } = {};
      
      // Parse the simple format: "A: 5"
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const match = line.match(/^([A-Z]):\s*(\d+)$/);
        if (match) {
          counts[match[1]] = parseInt(match[2], 10);
        }
      }
      
      return counts;
    } catch (error) {
      console.warn('Failed to read counts file:', error);
      return {};
    }
  }

  private static async writeCounts(counts: { [key: string]: number }): Promise<void> {
    try {
      const fs = await import('fs');
      
      // Sort letters alphabetically
      const sortedLetters = Object.keys(counts).sort();
      
      // Create content in simple format
      const lines = sortedLetters.map(letter => `${letter}: ${counts[letter]}`);
      const content = lines.join('\n') + '\n';
      
      // Write to file
      fs.writeFileSync(this.logFilePath, content);
    } catch (error) {
      console.warn('Failed to write counts file:', error);
    }
  }

  /**
   * Get current letter counts
   */
  static async getCounts(): Promise<{ [key: string]: number }> {
    if (this.isNodeEnvironment()) {
      return await this.readCounts();
    } else {
      // Browser can't read files directly
      return {};
    }
  }

  /**
   * Clear all counts
   */
  static async clearCounts(): Promise<void> {
    if (this.isNodeEnvironment()) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(this.logFilePath)) {
          fs.unlinkSync(this.logFilePath);
        }
      } catch (error) {
        console.warn('Failed to clear counts file:', error);
      }
    }
  }

  // Legacy methods for compatibility
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

  /**
   * Get log file path (Node.js only)
   */
  static async getLogFilePath(): Promise<string | null> {
    try {
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        const { join } = await import('path');
        return join(process.cwd(), this.logFilePath);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get comprehensive statistics (simplified for new format)
   */
  static async getStats(): Promise<{
    totalEntries: number;
    letterFrequency: { [key: string]: number };
    platformBreakdown: { [key: string]: number };
    fileEntries: number;
    needsSync: boolean;
  }> {
    const stats = {
      totalEntries: 0,
      letterFrequency: {} as { [key: string]: number },
      platformBreakdown: { 'all_platforms': 0 } as { [key: string]: number },
      fileEntries: 0,
      needsSync: false
    };

    // Try to read file data (Node.js only)
    if (this.isNodeEnvironment()) {
      try {
        const counts = await this.readCounts();
        stats.letterFrequency = counts;
        stats.totalEntries = Object.values(counts).reduce((sum, count) => sum + count, 0);
        stats.fileEntries = stats.totalEntries;
        stats.platformBreakdown['all_platforms'] = stats.totalEntries;
      } catch (error) {
        console.warn('Failed to read stats:', error);
      }
    }

    return stats;
  }
} 