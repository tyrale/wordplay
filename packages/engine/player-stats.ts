/**
 * Player Stats Engine - Core Logic
 *
 * Platform-agnostic engine that maintains a lifetime log of a player's
 * stats (words played, games won/lost, bot records, letter usage, etc.)
 * derived from completed games. Follows WordPlay's established
 * dependency-injection architecture pattern for cross-platform compatibility.
 */

import type {
  PlayerStatsEngine,
  PlayerStatsDependencies,
  PlayerStats,
  GameResultSummary,
  BotRecord
} from './interfaces';
import { getInitialPlayerStats } from './player-stats-definitions';

/**
 * Returns true if a turn history entry represents a pass
 * (the word did not change from the previous turn).
 */
function isPassEntry(entry: GameResultSummary['turnHistory'][number]): boolean {
  return entry.previousWord === entry.newWord;
}

function incrementLetterCounts(counts: Record<string, number>, letters: string[]): void {
  for (const letter of letters) {
    const key = letter.toUpperCase();
    counts[key] = (counts[key] || 0) + 1;
  }
}

function isSameCalendarDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isNextCalendarDay(previous: number, current: number): boolean {
  const prevDate = new Date(previous);
  const nextDay = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() + 1);
  return isSameCalendarDay(nextDay.getTime(), current);
}

/**
 * Creates a player stats engine instance with dependency injection
 */
export function createPlayerStatsEngine(dependencies: PlayerStatsDependencies): PlayerStatsEngine {
  let currentStats: PlayerStats | null = null;

  async function initialize(): Promise<void> {
    await ensureStateLoaded();
  }

  async function ensureStateLoaded(): Promise<PlayerStats> {
    if (currentStats === null) {
      try {
        currentStats = await dependencies.loadState();
      } catch (error) {
        console.warn('Failed to load player stats, using initial state:', error);
        currentStats = getInitialPlayerStats();
        try {
          await dependencies.saveState(currentStats);
        } catch (saveError) {
          console.warn('Failed to save initial player stats:', saveError);
        }
      }
    }
    return currentStats as PlayerStats;
  }

  async function saveState(): Promise<void> {
    if (currentStats) {
      await dependencies.saveState(currentStats);
    }
  }

  function updateDailyStreak(stats: PlayerStats, timestamp: number): void {
    if (stats.lastPlayedAt === null) {
      stats.currentDailyStreak = 1;
    } else if (isSameCalendarDay(stats.lastPlayedAt, timestamp)) {
      // Same day, streak unchanged
    } else if (isNextCalendarDay(stats.lastPlayedAt, timestamp)) {
      stats.currentDailyStreak += 1;
    } else {
      stats.currentDailyStreak = 1;
    }

    stats.longestDailyStreak = Math.max(stats.longestDailyStreak, stats.currentDailyStreak);
  }

  async function recordGameResult(result: GameResultSummary): Promise<PlayerStats> {
    const stats = await ensureStateLoaded();
    const timestamp = result.timestamp ?? dependencies.getTimestamp();

    const playerMoves = result.turnHistory.filter(entry => entry.playerId === result.playerId);
    const wordMoves = playerMoves.filter(entry => !isPassEntry(entry));
    const passMoves = playerMoves.filter(isPassEntry);

    // Words
    stats.totalWordsPlayed += wordMoves.length;
    stats.totalPasses += passMoves.length;

    for (const move of wordMoves) {
      const wordLength = move.newWord.length;

      if (wordLength > stats.longestWordLength) {
        stats.longestWordLength = wordLength;
        stats.longestWordPlayed = move.newWord;
      }

      if (stats.shortestWordLength === 0 || wordLength < stats.shortestWordLength) {
        stats.shortestWordLength = wordLength;
        stats.shortestWordPlayed = move.newWord;
      }

      if (move.score > stats.highestSingleMoveScore) {
        stats.highestSingleMoveScore = move.score;
      }

      for (const action of move.scoringBreakdown?.actions ?? []) {
        if (action.type === 'add') {
          stats.totalLettersAdded += action.letters?.length ?? 0;
          incrementLetterCounts(stats.letterUsageCounts, action.letters ?? []);
        } else if (action.type === 'remove') {
          stats.totalLettersRemoved += action.letters?.length ?? 0;
        } else if (action.type === 'rearrange') {
          stats.totalRearranges += 1;
        } else if (action.type === 'substitute') {
          stats.totalSubstitutions += 1;
        }
      }

      incrementLetterCounts(stats.keyLetterUsageCounts, move.keyLettersUsed ?? []);
      stats.totalKeyLetterPoints += move.scoringBreakdown?.keyLetterScore ?? 0;
    }

    // Games
    stats.gamesPlayed += 1;
    stats.totalTurnsPlayed += result.totalTurns;
    stats.totalScore += result.finalScore;

    if (result.finalScore > stats.highestGameScore) {
      stats.highestGameScore = result.finalScore;
    }

    if (stats.longestGameTurns === 0 || result.totalTurns > stats.longestGameTurns) {
      stats.longestGameTurns = result.totalTurns;
    }
    if (stats.shortestGameTurns === 0 || result.totalTurns < stats.shortestGameTurns) {
      stats.shortestGameTurns = result.totalTurns;
    }

    if (result.gameDurationMs !== null) {
      stats.totalPlayTimeMs += result.gameDurationMs;
      if (result.gameDurationMs > stats.longestGameDurationMs) {
        stats.longestGameDurationMs = result.gameDurationMs;
      }
      if (result.won && (stats.fastestWinDurationMs === 0 || result.gameDurationMs < stats.fastestWinDurationMs)) {
        stats.fastestWinDurationMs = result.gameDurationMs;
      }
    }

    if (result.tied) {
      stats.gamesTied += 1;
      stats.currentWinStreak = 0;
    } else if (result.won) {
      stats.gamesWon += 1;
      stats.currentWinStreak += 1;
      stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak);

      if (passMoves.length === 0) {
        stats.perfectGames += 1;
      }
    } else {
      stats.gamesLost += 1;
      stats.currentWinStreak = 0;
    }

    // Bots
    if (result.botId) {
      const record: BotRecord = stats.botRecords[result.botId] ?? { wins: 0, losses: 0, gamesPlayed: 0 };
      record.gamesPlayed += 1;
      if (result.won) {
        record.wins += 1;
        if (!stats.botsBeaten.includes(result.botId)) {
          stats.botsBeaten.push(result.botId);
        }
      } else if (!result.tied) {
        record.losses += 1;
      }
      stats.botRecords[result.botId] = record;
    }

    // Meta
    if (stats.firstPlayedAt === null) {
      stats.firstPlayedAt = timestamp;
    }
    updateDailyStreak(stats, timestamp);
    stats.lastPlayedAt = timestamp;

    await saveState();
    return getStats();
  }

  async function recordUnlockEarned(): Promise<PlayerStats> {
    const stats = await ensureStateLoaded();
    stats.totalUnlocksEarned += 1;
    await saveState();
    return getStats();
  }

  function getStats(): PlayerStats {
    if (!currentStats) {
      return getInitialPlayerStats();
    }
    return {
      ...currentStats,
      letterUsageCounts: { ...currentStats.letterUsageCounts },
      keyLetterUsageCounts: { ...currentStats.keyLetterUsageCounts },
      botRecords: Object.fromEntries(
        Object.entries(currentStats.botRecords).map(([id, record]) => [id, { ...record }])
      ),
      botsBeaten: [...currentStats.botsBeaten]
    };
  }

  async function resetStats(): Promise<void> {
    currentStats = getInitialPlayerStats();
    await saveState();
  }

  return {
    initialize,
    recordGameResult,
    recordUnlockEarned,
    getStats,
    resetStats
  };
}
