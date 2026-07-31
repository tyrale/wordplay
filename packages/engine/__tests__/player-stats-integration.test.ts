/**
 * Player Stats <-> GameStateManager Integration Test
 *
 * Reproduces the exact flow InteractiveGame.tsx uses: play a full game to
 * completion via the real LocalGameStateManagerWithDependencies, then feed
 * the resulting GameState into the player stats engine's recordGameResult,
 * to catch any data-shape mismatches between the two.
 */

import { describe, it, expect } from 'vitest';
import { LocalGameStateManagerWithDependencies as LocalGameStateManager } from '../gamestate';
import { createTestAdapter } from '../../../src/adapters/testAdapter';
import { createPlayerStatsEngine } from '../player-stats';
import { getInitialPlayerStats } from '../player-stats-definitions';
import type { PlayerStatsDependencies, PlayerStats, GameConfig } from '../interfaces';

function createInMemoryPlayerStatsDependencies(): PlayerStatsDependencies {
  let state: PlayerStats = getInitialPlayerStats();
  return {
    loadState: async () => state,
    saveState: async (newState: PlayerStats) => { state = newState; },
    getTimestamp: () => Date.now()
  };
}

describe('Player Stats + GameStateManager Integration', () => {
  it('records a completed bot game exactly as InteractiveGame.tsx would', async () => {
    const testAdapter = createTestAdapter();
    testAdapter.reset();
    ['CAT', 'CATS', 'BATS', 'BAT'].forEach(w => testAdapter.addWord(w));

    const config: GameConfig = {
      initialWord: 'CAT',
      allowBotPlayer: true,
      maxTurns: 2,
      botId: 'test-bot'
    };
    const dependencies = testAdapter.getGameDependencies();
    const gameManager = new LocalGameStateManager(dependencies, config);
    gameManager.startGame();

    // Human move
    const applied = gameManager.applyMove('CATS');
    expect(applied).toBe(true);

    // Bot move (should push currentTurn past maxTurns and finish the game)
    await gameManager.makeBotMove();

    const state = gameManager.getState();
    expect(state.gameStatus).toBe('finished');
    expect(state.turnHistory.length).toBeGreaterThan(0);

    // Mirror InteractiveGame.tsx's onGameStateChange 'finished' branch exactly
    const localId = 'human';
    const opponentId = 'bot';
    const humanScore = state.players.find(p => p.id === localId)?.score || 0;
    const botScore = state.players.find(p => p.id === opponentId)?.score || 0;
    const won = state.winner?.id === localId;
    const tied = humanScore === botScore;
    const gameDurationMs = state.gameStartTime && state.lastMoveTime
      ? state.lastMoveTime - state.gameStartTime
      : null;

    const statsEngine = createPlayerStatsEngine(createInMemoryPlayerStatsDependencies());
    const result = await statsEngine.recordGameResult({
      playerId: localId,
      botId: config.botId,
      won,
      tied,
      turnHistory: state.turnHistory,
      totalTurns: state.totalMoves,
      finalScore: humanScore,
      gameDurationMs,
      timestamp: Date.now()
    });

    expect(result.gamesPlayed).toBe(1);
    expect(result.totalWordsPlayed).toBeGreaterThan(0);
    expect(result.totalTurnsPlayed).toBeGreaterThan(0);
  });
});
