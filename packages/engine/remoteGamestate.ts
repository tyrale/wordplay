/**
 * Remote GameState Manager - Async "vs Human" Multiplayer
 *
 * Implements the same `IGameStateManager` contract as
 * `LocalGameStateManagerWithDependencies`, but backs the shared game state
 * with a persisted, remote store (e.g. Supabase) instead of a local bot.
 *
 * Design: composes an internal `LocalGameStateManagerWithDependencies` to
 * reuse all existing move validation/scoring/turn-history logic unchanged,
 * then persists the result of each successful move via the injected
 * `RemoteGameDependencies`, and reconciles local state whenever the remote
 * store reports a change (i.e. the opponent moved).
 */

import { LocalGameStateManagerWithDependencies } from './gamestate';
import type {
  GameState,
  GameConfig,
  GameStateDependencies,
  GameStateListener,
  RemoteGameDependencies,
  RemoteGameSnapshot,
  RemoteGameStatus,
  RemoteGameTurnRecord,
  IGameStateManager,
  Player,
  TurnHistory,
  ValidationResult,
  MoveAttempt,
  BotMove
} from './interfaces';

/**
 * Build an initial-load `GameState` from a `RemoteGameSnapshot`.
 *
 * Note: the remote store only persists `scoreEarned`/`keyLetterUsed` per
 * turn (not the full `ScoringResult` breakdown), so restored turn history
 * entries carry a minimal `scoringBreakdown`. This is sufficient for
 * score totals/turn display; full breakdown detail is only needed at the
 * moment a move is made (available locally at that time).
 */
function snapshotToGameState(snapshot: RemoteGameSnapshot): GameState {
  const players: Player[] = snapshot.players
    .slice()
    .sort((a, b) => a.playerIndex - b.playerIndex)
    .map(p => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot ?? false,
      score: p.score,
      isCurrentPlayer: p.playerIndex === snapshot.currentPlayerIndex
    }));

  const turnHistory: TurnHistory[] = snapshot.turnHistory.map(t => ({
    turnNumber: t.turnNumber,
    playerId: t.playerId,
    previousWord: t.previousWord,
    newWord: t.newWord,
    score: t.scoreEarned,
    keyLettersUsed: t.keyLetterUsed ? [t.keyLetterUsed] : [],
    scoringBreakdown: {
      score: t.scoreEarned,
      totalScore: t.scoreEarned,
      breakdown: { addLetterPoints: 0, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 0 },
      actions: [],
      keyLetterScore: 0,
      baseScore: t.scoreEarned,
      keyLettersUsed: t.keyLetterUsed ? [t.keyLetterUsed] : []
    },
    timestamp: t.timestamp
  }));

  const gameStatus: GameState['gameStatus'] =
    snapshot.status === 'completed' || snapshot.status === 'abandoned'
      ? 'finished'
      : snapshot.status === 'waiting'
        ? 'waiting'
        : 'playing';

  const winner = snapshot.winnerId ? players.find(p => p.id === snapshot.winnerId) || null : null;

  const config: GameConfig = {
    maxTurns: snapshot.maxTurns,
    allowBotPlayer: false,
    enableKeyLetters: true,
    enableLockedLetters: true,
    timePressureEnabled: snapshot.timePressureEnabled
  };

  return {
    gameStatus,
    currentWord: snapshot.currentWord,
    keyLetters: snapshot.keyLetters,
    lockedLetters: snapshot.lockedLetters,
    lockedKeyLetters: snapshot.lockedKeyLetters,
    players,
    currentPlayerIndex: snapshot.currentPlayerIndex,
    currentTurn: snapshot.currentTurn,
    maxTurns: snapshot.maxTurns,
    usedWords: snapshot.usedWords,
    usedKeyLetters: [],
    turnHistory,
    gameStartTime: turnHistory.length > 0 ? turnHistory[0].timestamp : Date.now(),
    lastMoveTime: turnHistory.length > 0 ? turnHistory[turnHistory.length - 1].timestamp : null,
    winner,
    totalMoves: turnHistory.length,
    config
  };
}

/**
 * Delay before a bot-fallback opponent "responds" with its move. Weighted
 * bimodal rather than a flat uniform range: mostly quick like an engaged
 * human would be, with an occasional slower outlier (distracted/typing a
 * longer word) - a flat random range reads as too mechanically uniform to
 * feel human turn-over-turn.
 */
function getBotMoveDelayMs(): number {
  const isSlowTurn = Math.random() < 0.2; // ~1 in 5 turns is a "slow" one
  return isSlowTurn
    ? 10000 + Math.random() * 10000 // 10-20s
    : 2000 + Math.random() * 4000; // 2-6s
}

export class RemoteGameStateManager implements IGameStateManager {
  private local: LocalGameStateManagerWithDependencies;
  private dependencies: GameStateDependencies;
  private remote: RemoteGameDependencies;
  private gameId: string;
  private unsubscribeRemote: (() => void) | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private syncing = false;
  /** The raw remote status as of the last successful sync, so callers can
   * distinguish a natural finish ('completed') from a resignation
   * ('abandoned') - `GameState.gameStatus` collapses both into 'finished'. */
  private lastRemoteStatus: RemoteGameStatus | null = null;
  /** Pending timer for driving a bot-fallback opponent's turn, if any. */
  private botMoveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Which `currentTurn` a bot move has already been scheduled/run for, so
   * a bot's turn is never double-scheduled by repeated refreshes (realtime
   * + poll can both fire around the same state change). */
  private botMoveScheduledForTurn: number | null = null;
  /**
   * Bot engine strategy per player id (e.g. 'easy-bot'), as of the last
   * synced snapshot. A vsmany bot-fallback game can have more than one bot
   * player with different strategies, so this can't be derived from
   * `GameState.config.botId` (a single-bot-game concept) - it's looked up
   * per-player instead whenever it's actually a bot's turn.
   */
  private botEngineIdByPlayerId = new Map<string, string>();

  constructor(dependencies: GameStateDependencies, remote: RemoteGameDependencies, gameId: string) {
    this.dependencies = dependencies;
    this.remote = remote;
    this.gameId = gameId;
    // Placeholder local config until initialize() hydrates real state.
    this.local = new LocalGameStateManagerWithDependencies(dependencies, { allowBotPlayer: false });
  }

  /**
   * Fetch the current remote snapshot, hydrate local state, and start
   * listening for opponent moves. Must be called before use.
   */
  public async initialize(): Promise<void> {
    await this.refreshFromRemote();
    this.unsubscribeRemote = this.remote.subscribeToGame(this.gameId, () => {
      this.refreshFromRemote().catch(error => {
        console.error('Failed to refresh remote game state:', error);
      });
    });
    // Poll as a fallback alongside the realtime subscription above - realtime
    // delivery isn't always guaranteed (e.g. websocket drops, tab backgrounding,
    // or a Supabase project where the publication isn't configured), and
    // without this an opponent's move could silently never show up until the
    // player leaves and re-opens the game. Short interval keeps vs-human play
    // feeling as responsive as vs-bot.
    this.pollInterval = setInterval(() => {
      this.refreshFromRemote().catch(error => {
        console.error('Failed to poll remote game state:', error);
      });
    }, 3000);
  }

  /** Unsubscribe from remote updates. Call on component unmount. */
  public dispose(): void {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.botMoveTimer) {
      clearTimeout(this.botMoveTimer);
      this.botMoveTimer = null;
    }
  }

  /**
   * Tears down and re-establishes the realtime subscription, then
   * immediately fetches the latest remote state - for callers that
   * detect their own app coming back to the foreground after being
   * backgrounded (e.g. RN's `AppState`, or a browser tab regaining
   * visibility). Native platforms (unlike a normal desktop browser tab)
   * routinely suspend a realtime WebSocket entirely while backgrounded
   * without the client necessarily noticing it needs to reconnect once
   * the app resumes - the existing 3-second poll (see `initialize()`)
   * already provides a resilience *floor* even if this is never called
   * (an opponent's move is never silently lost forever), but relying on
   * it alone means up to a 3-second-plus-however-long-the-JS-timer-was-
   * suspended delay before the board catches up right when a player
   * returns to the app - the single moment they're most likely to
   * actually be looking at it. Calling this makes that catch-up
   * immediate instead of waiting for the next poll tick, and gives the
   * realtime channel itself a fresh, known-good connection rather than
   * leaving a possibly-dead one in place indefinitely.
   */
  public async reconnect(): Promise<void> {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }
    this.unsubscribeRemote = this.remote.subscribeToGame(this.gameId, () => {
      this.refreshFromRemote().catch(error => {
        console.error('Failed to refresh remote game state:', error);
      });
    });
    await this.refreshFromRemote();
  }

  private async refreshFromRemote(): Promise<void> {
    if (this.syncing) return; // avoid overlapping fetches
    this.syncing = true;
    try {
      const snapshot = await this.remote.fetchGame(this.gameId);
      this.lastRemoteStatus = snapshot.status;
      const currentState = this.local.getState();
      const currentTurnCount = currentState.turnHistory.length;
      // Turn history only ever grows. If this fetch has *fewer* turns than
      // what's already loaded locally, it's a stale read racing our own
      // just-applied optimistic move (e.g. the realtime echo of our own
      // persistMove(), or a poll tick, landing before that write is actually
      // visible) - applying it would flash the board back to the previous
      // word for a moment before the next refresh catches back up. Since we
      // already have the newer state locally, just ignore this stale one.
      if (snapshot.turnHistory.length < currentTurnCount) {
        return;
      }
      const changed =
        snapshot.turnHistory.length !== currentTurnCount ||
        currentState.currentWord !== snapshot.currentWord;
      const statusChanged = snapshot.status !== currentState.gameStatus;
      // Also pick up players joining/leaving while a vsmany game is still
      // 'waiting' - the game's status/word/turn count don't change when a
      // new player joins, so without this check the waiting-room view would
      // never re-render to show them (only a subsequent unrelated change,
      // like the host manually starting the game, would trigger it).
      const playersChanged =
        snapshot.players.length !== currentState.players.length ||
        snapshot.players.some(p => !currentState.players.some(existing => existing.id === p.id));
      if (changed || statusChanged || playersChanged) {
        this.local.loadState(snapshotToGameState(snapshot));
      }
      this.botEngineIdByPlayerId.clear();
      for (const player of snapshot.players) {
        if (player.isBot && player.botEngineId) {
          this.botEngineIdByPlayerId.set(player.id, player.botEngineId);
        }
      }
    } finally {
      this.syncing = false;
    }
    this.maybeScheduleBotMove();
  }

  /**
   * If it's currently a bot-fallback opponent's turn, schedule it to
   * "respond" after a randomized human-like delay. Safe to call on every
   * refresh - only schedules once per turn (see `botMoveScheduledForTurn`),
   * and no-ops entirely for ordinary human-vs-human games (no bot player).
   */
  private maybeScheduleBotMove(): void {
    const state = this.local.getState();
    if (state.gameStatus !== 'playing') return;

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer?.isBot) return;

    if (this.botMoveScheduledForTurn === state.currentTurn) return;
    this.botMoveScheduledForTurn = state.currentTurn;

    if (this.botMoveTimer) clearTimeout(this.botMoveTimer);
    this.botMoveTimer = setTimeout(() => {
      this.runBotTurn().catch(error => {
        console.error('Bot opponent move failed:', error);
      });
    }, getBotMoveDelayMs());
  }

  /**
   * Compute and persist a bot-fallback opponent's move for the current
   * turn. Generates the move the same way single-player vs-bot games do
   * (`dependencies.generateBotMove`), but calls it directly with the
   * *current* bot player's own strategy (see `botEngineIdByPlayerId`)
   * rather than going through `LocalGameStateManagerWithDependencies
   * .makeBotMove()`, since that reads a single game-wide `config.botId`
   * that can't represent a vsmany game with more than one bot player.
   */
  private async runBotTurn(): Promise<void> {
    this.botMoveTimer = null;

    const stateBefore = this.local.getState();
    if (stateBefore.gameStatus !== 'playing') return;

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer?.isBot) return; // state moved on (e.g. another client already played it)

    const botEngineId = this.botEngineIdByPlayerId.get(currentPlayer.id);
    const allLockedLetters = [...stateBefore.lockedLetters, ...stateBefore.lockedKeyLetters];
    const botResult = await this.dependencies.generateBotMove(stateBefore.currentWord, {
      keyLetters: stateBefore.keyLetters,
      lockedLetters: allLockedLetters,
      maxCandidates: 500,
      botId: botEngineId
    });

    let applied = false;
    if (botResult.move) {
      const moveAttempt = this.local.attemptMove(botResult.move.word);
      if (moveAttempt.canApply) {
        applied = this.local.applyMove(moveAttempt);
      }
    }
    if (!applied) {
      // No valid move found (or it failed to apply) - pass, same fallback
      // single-player bots use in this situation (see gamestate.ts).
      if (!this.local.passTurn()) return;
    }

    const stateAfter = this.local.getState();
    const lastTurn = stateAfter.turnHistory[stateAfter.turnHistory.length - 1];
    if (!lastTurn) return;

    const turnRecord: RemoteGameTurnRecord = {
      turnNumber: lastTurn.turnNumber,
      playerId: lastTurn.playerId,
      previousWord: lastTurn.previousWord,
      newWord: lastTurn.newWord,
      scoreEarned: lastTurn.score,
      keyLetterUsed: lastTurn.keyLettersUsed[0] ?? null,
      timestamp: lastTurn.timestamp
    };

    try {
      await this.remote.persistMove(this.gameId, turnRecord, {
        currentWord: stateAfter.currentWord,
        keyLetters: stateAfter.keyLetters,
        lockedLetters: stateAfter.lockedLetters,
        lockedKeyLetters: stateAfter.lockedKeyLetters,
        usedWords: stateAfter.usedWords,
        currentTurn: stateAfter.currentTurn,
        currentPlayerIndex: stateAfter.currentPlayerIndex,
        status: stateAfter.gameStatus === 'finished' ? 'completed' : 'active',
        winnerId: stateAfter.winner?.id ?? null
      });
    } catch (error) {
      console.error('Failed to persist bot opponent move, reconciling with remote state:', error);
      // Most likely another client already submitted this same bot turn
      // (e.g. two humans had the game open at once) - the turn-number
      // uniqueness constraint rejects the loser, so just resync.
      await this.refreshFromRemote();
    }
  }

  public getState(): GameState {
    return this.local.getState();
  }

  /** Whether the most recently synced remote state was ended via resignation
   * (as opposed to a natural finish at max turns), so the UI can show a
   * distinct "opponent left" message instead of a win/lose result. */
  public wasAbandoned(): boolean {
    return this.lastRemoteStatus === 'abandoned';
  }

  public getCurrentPlayer(): Player | null {
    return this.local.getCurrentPlayer();
  }

  public startGame(): void {
    // Note: LocalGameStateManagerWithDependencies.startGame() doesn't accept
    // an initial word override; the starting word is set during hydration
    // from the remote snapshot instead.
    this.local.startGame();
  }

  public resetGame(config?: GameConfig): void {
    this.local.resetGame(config);
  }

  public validateMove(word: string): ValidationResult {
    return this.local.validateMove(word);
  }

  public attemptMove(newWord: string): MoveAttempt {
    return this.local.attemptMove(newWord);
  }

  public setWord(word: string): boolean {
    return this.local.setWord(word);
  }

  public loadState(state: GameState): void {
    this.local.loadState(state);
  }

  public subscribe(listener: GameStateListener): () => void {
    return this.local.subscribe(listener);
  }

  /**
   * No-op for external callers: unlike single-player, a bot-fallback
   * opponent's move is never triggered on demand by the UI - it's scheduled
   * and driven internally (see `maybeScheduleBotMove`/`runBotTurn`) with a
   * randomized human-like delay after each remote refresh, so it feels like
   * waiting on a real opponent rather than an instant bot response.
   */
  public async makeBotMove(): Promise<BotMove | null> {
    return null;
  }

  public addKeyLetter(letter: string): void {
    this.local.addKeyLetter(letter);
  }

  public removeKeyLetter(letter: string): void {
    this.local.removeKeyLetter(letter);
  }

  public addLockedLetter(letter: string): void {
    this.local.addLockedLetter(letter);
  }

  public removeLockedLetter(letter: string): void {
    this.local.removeLockedLetter(letter);
  }

  public applyMove(wordOrAttempt: string | MoveAttempt): boolean {
    const stateBefore = this.local.getState();
    const success = this.local.applyMove(wordOrAttempt);
    if (!success) return false;

    const stateAfter = this.local.getState();
    const lastTurn = stateAfter.turnHistory[stateAfter.turnHistory.length - 1];
    if (!lastTurn) return success;

    const turnRecord: RemoteGameTurnRecord = {
      turnNumber: lastTurn.turnNumber,
      playerId: lastTurn.playerId,
      previousWord: lastTurn.previousWord,
      newWord: lastTurn.newWord,
      scoreEarned: lastTurn.score,
      keyLetterUsed: lastTurn.keyLettersUsed[0] ?? null,
      timestamp: lastTurn.timestamp
    };

    this.remote
      .persistMove(this.gameId, turnRecord, {
        currentWord: stateAfter.currentWord,
        keyLetters: stateAfter.keyLetters,
        lockedLetters: stateAfter.lockedLetters,
        lockedKeyLetters: stateAfter.lockedKeyLetters,
        usedWords: stateAfter.usedWords,
        currentTurn: stateAfter.currentTurn,
        currentPlayerIndex: stateAfter.currentPlayerIndex,
        status: stateAfter.gameStatus === 'finished' ? 'completed' : 'active',
        winnerId: stateAfter.winner?.id ?? null
      })
      .catch(error => {
        console.error('Failed to persist multiplayer move, reverting to remote state:', error);
        // Reconcile with whatever the server actually has, since our
        // optimistic local write may not have landed.
        this.refreshFromRemote().catch(refreshError => {
          console.error('Failed to reconcile after persist failure:', refreshError);
        });
      });

    void stateBefore; // retained for potential future diffing/rollback use
    this.maybeScheduleBotMove(); // in case the turn just passed to a bot opponent
    return success;
  }

  public passTurn(): boolean {
    const success = this.local.passTurn();
    if (!success) return false;

    const stateAfter = this.local.getState();
    const lastTurn = stateAfter.turnHistory[stateAfter.turnHistory.length - 1];
    if (!lastTurn) return success;

    const turnRecord: RemoteGameTurnRecord = {
      turnNumber: lastTurn.turnNumber,
      playerId: lastTurn.playerId,
      previousWord: lastTurn.previousWord,
      newWord: lastTurn.newWord,
      scoreEarned: 0,
      keyLetterUsed: null,
      timestamp: lastTurn.timestamp
    };

    this.remote
      .persistMove(this.gameId, turnRecord, {
        currentWord: stateAfter.currentWord,
        keyLetters: stateAfter.keyLetters,
        lockedLetters: stateAfter.lockedLetters,
        lockedKeyLetters: stateAfter.lockedKeyLetters,
        usedWords: stateAfter.usedWords,
        currentTurn: stateAfter.currentTurn,
        currentPlayerIndex: stateAfter.currentPlayerIndex,
        status: stateAfter.gameStatus === 'finished' ? 'completed' : 'active',
        winnerId: stateAfter.winner?.id ?? null
      })
      .catch(error => {
        console.error('Failed to persist pass turn:', error);
        this.refreshFromRemote().catch(refreshError => {
          console.error('Failed to reconcile after persist failure:', refreshError);
        });
      });

    this.maybeScheduleBotMove(); // in case the turn just passed to a bot opponent
    return success;
  }

  /** Resign: mark the game abandoned remotely and locally finish it. */
  public async resign(): Promise<void> {
    const localPlayerId = this.remote.getLocalPlayerId();
    await this.remote.abandonGame(this.gameId, localPlayerId);
    await this.refreshFromRemote();
  }
}

/**
 * Create a remote (vs human) game state manager and initialize it
 * (fetches current state and subscribes to opponent moves).
 */
export async function createRemoteGameStateManager(
  dependencies: GameStateDependencies,
  remote: RemoteGameDependencies,
  gameId: string
): Promise<RemoteGameStateManager> {
  const manager = new RemoteGameStateManager(dependencies, remote, gameId);
  await manager.initialize();
  return manager;
}
