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

/**
 * Minimal file-system access needed for the Node.js-only logging path,
 * injected rather than imported directly (see `configureNodeFileSystem`
 * below). This is the engine's usual dependency-injection pattern applied
 * here specifically because a literal `import('fs')`/`import('path')` in
 * this file - even one that's runtime-guarded and never actually
 * executed - breaks Metro's static module resolution when bundling for
 * React Native (unlike Vite/web, Metro doesn't shim missing Node builtins
 * for the ios/android platforms; it errors at bundle time before the
 * runtime guard ever gets a chance to run).
 */
export interface KeyLetterNodeFileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: 'utf-8'): string;
  writeFileSync(path: string, content: string): void;
  unlinkSync(path: string): void;
  cwd(): string;
  joinPath(...parts: string[]): string;
}

export class KeyLetterLogger {
  private static logFilePath = 'key-letter-counts.txt';
  private static nodeFs: KeyLetterNodeFileSystem | null = null;

  /**
   * Inject Node.js file-system access - call this once from a Node-only
   * consumer (e.g. `src/adapters/nodeAdapter.ts`, `terminal-game.ts`).
   * Browser/native adapters never call this; without it, the Node-only
   * code paths below simply no-op (matching the existing browser
   * behavior - browsers can't write files either).
   */
  static configureNodeFileSystem(fs: KeyLetterNodeFileSystem): void {
    this.nodeFs = fs;
  }

  /**
   * Log a key letter generation event (universal - all platforms write to same file)
   */
  static async logKeyLetter(
    letter: string,
    _gameId: string,
    _turnNumber: number
  ): Promise<void> {
    const upperLetter = letter.toUpperCase();

    // Try to update the count file
    if (this.isNodeEnvironment()) {
      // Node.js environment - update file directly
      await this.updateCountFile(upperLetter);
    } else {
      // Browser/native environment - send to logging endpoint
      await this.sendToEndpoint(upperLetter);
    }
  }

  private static isNodeEnvironment(): boolean {
    return this.nodeFs !== null;
  }

  private static async updateCountFile(letter: string): Promise<void> {
    try {
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
    // The local logging server (log-server.cjs) only runs during local development
    // and is never available in deployed builds, so we never attempt a network
    // request here. This just logs locally for optional dev-time inspection.
    console.log('Key Letter:', letter);
  }

  private static async readCounts(): Promise<{ [key: string]: number }> {
    if (!this.nodeFs) return {};
    try {
      if (!this.nodeFs.existsSync(this.logFilePath)) {
        return {};
      }
      
      const content = this.nodeFs.readFileSync(this.logFilePath, 'utf-8');
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
    if (!this.nodeFs) return;
    try {
      // Sort letters alphabetically
      const sortedLetters = Object.keys(counts).sort();
      
      // Create content in simple format
      const lines = sortedLetters.map(letter => `${letter}: ${counts[letter]}`);
      const content = lines.join('\n') + '\n';
      
      // Write to file
      this.nodeFs.writeFileSync(this.logFilePath, content);
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
    if (this.nodeFs) {
      try {
        if (this.nodeFs.existsSync(this.logFilePath)) {
          this.nodeFs.unlinkSync(this.logFilePath);
        }
      } catch (error) {
        console.warn('Failed to clear counts file:', error);
      }
    }
  }

  /**
   * Get log file path (Node.js only)
   */
  static async getLogFilePath(): Promise<string | null> {
    if (!this.nodeFs) return null;
    try {
      return this.nodeFs.joinPath(this.nodeFs.cwd(), this.logFilePath);
    } catch {
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