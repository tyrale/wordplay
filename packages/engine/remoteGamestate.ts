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
      isBot: false,
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
    enableLockedLetters: true
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

export class RemoteGameStateManager implements IGameStateManager {
  private local: LocalGameStateManagerWithDependencies;
  private remote: RemoteGameDependencies;
  private gameId: string;
  private unsubscribeRemote: (() => void) | null = null;
  private syncing = false;

  constructor(dependencies: GameStateDependencies, remote: RemoteGameDependencies, gameId: string) {
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
  }

  /** Unsubscribe from remote updates. Call on component unmount. */
  public dispose(): void {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }
  }

  private async refreshFromRemote(): Promise<void> {
    if (this.syncing) return; // avoid overlapping fetches
    this.syncing = true;
    try {
      const snapshot = await this.remote.fetchGame(this.gameId);
      const currentTurnCount = this.local.getState().turnHistory.length;
      if (snapshot.turnHistory.length !== currentTurnCount || this.local.getState().currentWord !== snapshot.currentWord) {
        this.local.loadState(snapshotToGameState(snapshot));
      } else if (snapshot.status !== this.local.getState().gameStatus) {
        this.local.loadState(snapshotToGameState(snapshot));
      }
    } finally {
      this.syncing = false;
    }
  }

  public getState(): GameState {
    return this.local.getState();
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

  /** No bot in vs-human mode. */
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
