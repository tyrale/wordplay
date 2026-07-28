/**
 * Player Stats Engine Tests
 *
 * Tests for the local player stats log: word stats, game stats,
 * bot records, key-letter usage, streaks, and persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPlayerStatsEngine } from '../player-stats';
import { getInitialPlayerStats } from '../player-stats-definitions';
import type { PlayerStatsDependencies, PlayerStatsEngine, PlayerStats, GameResultSummary, TurnHistory, ScoringResult } from '../interfaces';

function createTestPlayerStatsDependencies(initial?: PlayerStats): PlayerStatsDependencies {
  let state: PlayerStats = initial ?? getInitialPlayerStats();
  let now = 1_700_000_000_000; // fixed base timestamp

  return {
    loadState: async () => state,
    saveState: async (newState: PlayerStats) => { state = newState; },
    getTimestamp: () => now
  };
}

function makeScoring(overrides: Partial<ScoringResult> = {}): ScoringResult {
  return {
    score: overrides.score ?? 1,
    totalScore: overrides.totalScore ?? 1,
    breakdown: overrides.breakdown ?? { addLetterPoints: 1, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 0 },
    actions: overrides.actions ?? [{ type: 'add', letters: ['S'], score: 1 }],
    keyLetterScore: overrides.keyLetterScore ?? 0,
    baseScore: overrides.baseScore ?? 1,
    keyLettersUsed: overrides.keyLettersUsed ?? []
  };
}

function makeTurn(overrides: Partial<TurnHistory>): TurnHistory {
  return {
    turnNumber: overrides.turnNumber ?? 1,
    playerId: overrides.playerId ?? 'human',
    previousWord: overrides.previousWord ?? 'CAT',
    newWord: overrides.newWord ?? 'CATS',
    score: overrides.score ?? 1,
    keyLettersUsed: overrides.keyLettersUsed ?? [],
    scoringBreakdown: overrides.scoringBreakdown ?? makeScoring({ score: overrides.score ?? 1 }),
    timestamp: overrides.timestamp ?? Date.now()
  };
}

function makeGameResult(overrides: Partial<GameResultSummary> = {}): GameResultSummary {
  return {
    playerId: 'human',
    botId: 'basicBot',
    won: true,
    tied: false,
    turnHistory: [
      makeTurn({ turnNumber: 1, previousWord: 'CAT', newWord: 'CATS', score: 2 }),
      makeTurn({ turnNumber: 2, playerId: 'basicBot', previousWord: 'CATS', newWord: 'SCAT', score: 1 })
    ],
    totalTurns: 2,
    finalScore: 2,
    gameDurationMs: 10_000,
    timestamp: 1_700_000_000_000,
    ...overrides
  };
}

describe('Player Stats Engine', () => {
  let engine: PlayerStatsEngine;

  beforeEach(() => {
    engine = createPlayerStatsEngine(createTestPlayerStatsDependencies());
  });

  describe('Initial State', () => {
    it('starts with all-zero stats', () => {
      const stats = engine.getStats();
      expect(stats.gamesPlayed).toBe(0);
      expect(stats.totalWordsPlayed).toBe(0);
      expect(stats.botRecords).toEqual({});
      expect(stats.botsBeaten).toEqual([]);
      expect(stats.firstPlayedAt).toBeNull();
      expect(stats.lastPlayedAt).toBeNull();
    });
  });

  describe('Word Stats', () => {
    it('counts words played and passes for the local player only', async () => {
      const result = makeGameResult({
        turnHistory: [
          makeTurn({ playerId: 'human', previousWord: 'CAT', newWord: 'CATS' }),
          makeTurn({ playerId: 'human', previousWord: 'CATS', newWord: 'CATS' }), // pass
          makeTurn({ playerId: 'basicBot', previousWord: 'CATS', newWord: 'SCAT' })
        ]
      });

      const stats = await engine.recordGameResult(result);
      expect(stats.totalWordsPlayed).toBe(1);
      expect(stats.totalPasses).toBe(1);
    });

    it('tracks longest and shortest word played', async () => {
      await engine.recordGameResult(makeGameResult({
        turnHistory: [
          makeTurn({ playerId: 'human', previousWord: 'CAT', newWord: 'CAT' }),
          makeTurn({ playerId: 'human', previousWord: 'CAT', newWord: 'CATS' }),
          makeTurn({ playerId: 'human', previousWord: 'CATS', newWord: 'SCATTER' })
        ]
      }));

      const stats = engine.getStats();
      expect(stats.longestWordPlayed).toBe('SCATTER');
      expect(stats.longestWordLength).toBe(7);
      expect(stats.shortestWordPlayed).toBe('CATS');
      expect(stats.shortestWordLength).toBe(4);
    });

    it('accumulates letter usage counts from add actions', async () => {
      await engine.recordGameResult(makeGameResult({
        turnHistory: [
          makeTurn({
            playerId: 'human',
            previousWord: 'CAT',
            newWord: 'CATS',
            scoringBreakdown: makeScoring({ actions: [{ type: 'add', letters: ['S'], score: 1 }] })
          }),
          makeTurn({
            playerId: 'human',
            previousWord: 'CATS',
            newWord: 'SCATS',
            scoringBreakdown: makeScoring({ actions: [{ type: 'add', letters: ['S'], score: 1 }] })
          })
        ]
      }));

      const stats = engine.getStats();
      expect(stats.letterUsageCounts.S).toBe(2);
      expect(stats.totalLettersAdded).toBe(2);
    });

    it('tracks key letter usage and points', async () => {
      await engine.recordGameResult(makeGameResult({
        turnHistory: [
          makeTurn({
            playerId: 'human',
            previousWord: 'CAT',
            newWord: 'CATS',
            keyLettersUsed: ['S'],
            scoringBreakdown: makeScoring({ keyLetterScore: 3, keyLettersUsed: ['S'] })
          })
        ]
      }));

      const stats = engine.getStats();
      expect(stats.keyLetterUsageCounts.S).toBe(1);
      expect(stats.totalKeyLetterPoints).toBe(3);
    });
  });

  describe('Game Stats', () => {
    it('increments gamesPlayed, gamesWon, and win streak on a win', async () => {
      await engine.recordGameResult(makeGameResult({ won: true, tied: false }));
      const stats = engine.getStats();
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.gamesWon).toBe(1);
      expect(stats.currentWinStreak).toBe(1);
      expect(stats.longestWinStreak).toBe(1);
    });

    it('resets win streak on a loss and increments gamesLost', async () => {
      await engine.recordGameResult(makeGameResult({ won: true, tied: false }));
      await engine.recordGameResult(makeGameResult({ won: false, tied: false }));

      const stats = engine.getStats();
      expect(stats.gamesLost).toBe(1);
      expect(stats.currentWinStreak).toBe(0);
      expect(stats.longestWinStreak).toBe(1);
    });

    it('records ties separately without counting as win or loss', async () => {
      await engine.recordGameResult(makeGameResult({ won: false, tied: true }));
      const stats = engine.getStats();
      expect(stats.gamesTied).toBe(1);
      expect(stats.gamesWon).toBe(0);
      expect(stats.gamesLost).toBe(0);
    });

    it('tracks a perfect game (win with zero passes)', async () => {
      await engine.recordGameResult(makeGameResult({
        won: true,
        turnHistory: [makeTurn({ playerId: 'human', previousWord: 'CAT', newWord: 'CATS' })]
      }));

      expect(engine.getStats().perfectGames).toBe(1);
    });

    it('does not count a perfect game if the player passed', async () => {
      await engine.recordGameResult(makeGameResult({
        won: true,
        turnHistory: [
          makeTurn({ playerId: 'human', previousWord: 'CAT', newWord: 'CAT' }), // pass
          makeTurn({ playerId: 'human', previousWord: 'CAT', newWord: 'CATS' })
        ]
      }));

      expect(engine.getStats().perfectGames).toBe(0);
    });

    it('tracks highest game score and highest single move score', async () => {
      await engine.recordGameResult(makeGameResult({
        finalScore: 15,
        turnHistory: [makeTurn({ playerId: 'human', score: 9, previousWord: 'CAT', newWord: 'SCATTER' })]
      }));

      const stats = engine.getStats();
      expect(stats.highestGameScore).toBe(15);
      expect(stats.highestSingleMoveScore).toBe(9);
    });

    it('tracks total, longest, and fastest game durations', async () => {
      await engine.recordGameResult(makeGameResult({ won: true, gameDurationMs: 5_000 }));
      await engine.recordGameResult(makeGameResult({ won: true, gameDurationMs: 20_000 }));

      const stats = engine.getStats();
      expect(stats.totalPlayTimeMs).toBe(25_000);
      expect(stats.longestGameDurationMs).toBe(20_000);
      expect(stats.fastestWinDurationMs).toBe(5_000);
    });
  });

  describe('Bot Records', () => {
    it('tracks per-bot wins, losses, and games played', async () => {
      await engine.recordGameResult(makeGameResult({ botId: 'easy-bot', won: true }));
      await engine.recordGameResult(makeGameResult({ botId: 'easy-bot', won: false }));
      await engine.recordGameResult(makeGameResult({ botId: 'pirate-bot', won: true }));

      const stats = engine.getStats();
      expect(stats.botRecords['easy-bot']).toEqual({ wins: 1, losses: 1, gamesPlayed: 2 });
      expect(stats.botRecords['pirate-bot']).toEqual({ wins: 1, losses: 0, gamesPlayed: 1 });
      expect(stats.botsBeaten.sort()).toEqual(['easy-bot', 'pirate-bot']);
    });

    it('does not duplicate a bot in botsBeaten across multiple wins', async () => {
      await engine.recordGameResult(makeGameResult({ botId: 'easy-bot', won: true }));
      await engine.recordGameResult(makeGameResult({ botId: 'easy-bot', won: true }));

      expect(engine.getStats().botsBeaten).toEqual(['easy-bot']);
    });
  });

  describe('Meta / Streaks', () => {
    it('sets firstPlayedAt on the first game and updates lastPlayedAt each time', async () => {
      await engine.recordGameResult(makeGameResult({ timestamp: 1_700_000_000_000 }));
      await engine.recordGameResult(makeGameResult({ timestamp: 1_700_000_100_000 }));

      const stats = engine.getStats();
      expect(stats.firstPlayedAt).toBe(1_700_000_000_000);
      expect(stats.lastPlayedAt).toBe(1_700_000_100_000);
    });

    it('increments daily streak on consecutive calendar days and resets on a gap', async () => {
      const day1 = new Date(2025, 0, 1, 10, 0, 0).getTime();
      const day2 = new Date(2025, 0, 2, 10, 0, 0).getTime();
      const day5 = new Date(2025, 0, 5, 10, 0, 0).getTime();

      await engine.recordGameResult(makeGameResult({ timestamp: day1 }));
      expect(engine.getStats().currentDailyStreak).toBe(1);

      await engine.recordGameResult(makeGameResult({ timestamp: day2 }));
      expect(engine.getStats().currentDailyStreak).toBe(2);

      await engine.recordGameResult(makeGameResult({ timestamp: day5 }));
      const stats = engine.getStats();
      expect(stats.currentDailyStreak).toBe(1);
      expect(stats.longestDailyStreak).toBe(2);
    });
  });

  describe('recordUnlockEarned', () => {
    it('increments totalUnlocksEarned', async () => {
      await engine.recordUnlockEarned();
      await engine.recordUnlockEarned();
      expect(engine.getStats().totalUnlocksEarned).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('resets all stats back to initial state', async () => {
      await engine.recordGameResult(makeGameResult());
      await engine.resetStats();

      expect(engine.getStats()).toEqual(getInitialPlayerStats());
    });
  });

  describe('Persistence', () => {
    it('persists state via saveState and reloads it on initialize', async () => {
      const deps = createTestPlayerStatsDependencies();
      const first = createPlayerStatsEngine(deps);
      await first.recordGameResult(makeGameResult());

      const second = createPlayerStatsEngine(deps);
      await second.initialize();
      expect(second.getStats().gamesPlayed).toBe(1);
    });
  });
});
