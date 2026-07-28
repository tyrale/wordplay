/**
 * Player Stats Definitions
 *
 * Provides the initial/default PlayerStats state for a fresh user.
 * Kept separate from `player-stats.ts` so the default shape can be
 * imported without pulling in the engine logic (mirrors the
 * `unlock-definitions.ts` / `unlocks.ts` split).
 */

import type { PlayerStats } from './interfaces';

/**
 * Get a fresh copy of the initial player stats state
 */
export function getInitialPlayerStats(): PlayerStats {
  return {
    // Words
    totalWordsPlayed: 0,
    totalPasses: 0,
    longestWordPlayed: '',
    longestWordLength: 0,
    shortestWordPlayed: '',
    shortestWordLength: 0,
    totalLettersAdded: 0,
    totalLettersRemoved: 0,
    totalRearranges: 0,
    totalSubstitutions: 0,
    letterUsageCounts: {},

    // Games
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesTied: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    totalTurnsPlayed: 0,
    longestGameTurns: 0,
    shortestGameTurns: 0,
    totalScore: 0,
    highestGameScore: 0,
    highestSingleMoveScore: 0,
    perfectGames: 0,
    totalPlayTimeMs: 0,
    longestGameDurationMs: 0,
    fastestWinDurationMs: 0,

    // Bots
    botRecords: {},
    botsBeaten: [],

    // Key letters
    keyLetterUsageCounts: {},
    totalKeyLetterPoints: 0,

    // Meta
    totalUnlocksEarned: 0,
    firstPlayedAt: null,
    lastPlayedAt: null,
    currentDailyStreak: 0,
    longestDailyStreak: 0
  };
}
