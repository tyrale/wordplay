/**
 * Browser-based Key Letter Statistics Analyzer
 * Reads key letter data from localStorage and provides analysis
 */

interface KeyLetterEntry {
  timestamp: string;
  letter: string;
  gameId: string;
  turnNumber: number;
  platform: string;
}

interface LetterFrequency {
  letter: string;
  count: number;
  percentage: string;
}

interface GameStats {
  gameId: string;
  letters: string[];
  platform: string;
  timestamp: string;
}

interface AnalysisResult {
  totalLetters: number;
  totalGames: number;
  letterFrequency: LetterFrequency[];
  platformBreakdown: { [key: string]: number };
  recentGames: GameStats[];
}

export class KeyLetterAnalyzer {
  private static readonly STORAGE_KEY = 'wordplay_key_letter_stats';

  /**
   * Get all key letter entries from localStorage
   */
  static getAllKeyLetters(): KeyLetterEntry[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }

      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return [];
      }

      const entries = JSON.parse(data);
      return Array.isArray(entries) ? entries : [];
    } catch (error) {
      console.warn('Failed to read key letter data from localStorage:', error);
      return [];
    }
  }

  /**
   * Analyze key letter frequency data
   */
  static analyzeFrequency(): AnalysisResult {
    const logs = this.getAllKeyLetters();

    if (logs.length === 0) {
      return {
        totalLetters: 0,
        totalGames: 0,
        letterFrequency: [],
        platformBreakdown: {},
        recentGames: []
      };
    }

    const letterCounts: { [key: string]: number } = {};
    const platformCounts: { [key: string]: number } = {};
    const gameStats: { [key: string]: any } = {};

    logs.forEach(log => {
      // Count letters
      letterCounts[log.letter] = (letterCounts[log.letter] || 0) + 1;

      // Count platforms
      platformCounts[log.platform] = (platformCounts[log.platform] || 0) + 1;

      // Track games
      if (!gameStats[log.gameId]) {
        gameStats[log.gameId] = {
          letters: [],
          platform: log.platform,
          firstSeen: log.timestamp
        };
      }
      gameStats[log.gameId].letters.push(log.letter);
    });

    // Sort letters by frequency
    const sortedLetters = Object.entries(letterCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([letter, count]) => ({
        letter,
        count,
        percentage: ((count / logs.length) * 100).toFixed(1)
      }));

    return {
      totalLetters: logs.length,
      totalGames: Object.keys(gameStats).length,
      letterFrequency: sortedLetters,
      platformBreakdown: platformCounts,
      recentGames: Object.entries(gameStats)
        .sort(([,a], [,b]) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
        .slice(0, 10)
        .map(([gameId, stats]) => ({
          gameId,
          letters: stats.letters,
          platform: stats.platform,
          timestamp: stats.firstSeen
        }))
    };
  }

  /**
   * Get unused letters
   */
  static getUnusedLetters(): string[] {
    const analysis = this.analyzeFrequency();
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const usedLetters = new Set(analysis.letterFrequency.map(item => item.letter.toUpperCase()));
    return allLetters.filter(letter => !usedLetters.has(letter));
  }

  /**
   * Export data as JSON
   */
  static exportData(): string {
    const logs = this.getAllKeyLetters();
    const analysis = this.analyzeFrequency();

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      source: 'browser_localStorage',
      summary: analysis,
      rawData: logs,
      metadata: {
        version: '2.0',
        description: 'WordPlay key letter statistics from browser',
        platform: 'browser'
      }
    }, null, 2);
  }

  /**
   * Clear all stored data
   */
  static clearData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('Browser key letter data cleared');
      }
    } catch (error) {
      console.warn('Failed to clear key letter data:', error);
    }
  }

  /**
   * Get formatted statistics for display
   */
  static getFormattedStats(): string {
    const analysis = this.analyzeFrequency();

    if (analysis.totalLetters === 0) {
      return 'No key letter data available yet. Play some games to see statistics!';
    }

    let output = `🎯 KEY LETTER STATISTICS\n`;
    output += `========================\n\n`;
    output += `📊 Total Key Letters: ${analysis.totalLetters}\n`;
    output += `🎮 Total Games: ${analysis.totalGames}\n\n`;

    // Platform breakdown
    output += `🌐 PLATFORM BREAKDOWN:\n`;
    Object.entries(analysis.platformBreakdown).forEach(([platform, count]) => {
      const percentage = ((count / analysis.totalLetters) * 100).toFixed(1);
      const platformName = {
        'browser': '🌐 Web Browser',
        'mobile_browser': '📱 Mobile Browser',
        'nodejs': '🖥️ Terminal',
        'unknown': '❓ Unknown'
      }[platform] || platform;
      
      output += `   ${platformName}: ${count} letters (${percentage}%)\n`;
    });

    output += `\n📈 LETTER FREQUENCY:\n`;
    analysis.letterFrequency.slice(0, 10).forEach(({ letter, count, percentage }) => {
      output += `   ${letter}: ${count} times (${percentage}%)\n`;
    });

    const unusedLetters = this.getUnusedLetters();
    if (unusedLetters.length > 0) {
      output += `\n🚫 Unused Letters: ${unusedLetters.join(', ')}\n`;
    } else {
      output += `\n✅ All letters have been used!\n`;
    }

    if (analysis.recentGames.length > 0) {
      output += `\n🕒 RECENT GAMES:\n`;
      analysis.recentGames.slice(0, 5).forEach((game, index) => {
        const date = new Date(game.timestamp).toLocaleDateString();
        output += `   ${index + 1}. ${game.gameId}: ${game.letters.join(', ')} (${date})\n`;
      });
    }

    return output;
  }
} 