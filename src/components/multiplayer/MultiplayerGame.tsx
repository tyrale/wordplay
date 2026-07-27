import React, { useCallback, useEffect, useState } from 'react';
import { InteractiveGame } from '../game/InteractiveGame';
import { useMultiplayerManager } from '../../hooks/useMultiplayerManager';
import { getGameJoinInfo, startWaitingGame } from '../../adapters/supabaseMultiplayerAdapter';
import './MultiplayerGame.css';

export interface MultiplayerGameResult {
  winnerId: string | null;
  localPlayerId: string;
  localScore: number;
  opponentScore: number;
  /** The opponent's vanity display name, for the end-of-game overlay. */
  opponentName: string;
  /** True if the game ended because a player resigned, rather than reaching
   * max turns naturally - shown as a distinct "match ended" overlay instead
   * of a win/lose result. */
  resigned: boolean;
}

export interface MultiplayerGameProps {
  gameId: string;
  onExit: () => void;
  onGameEnd?: (result: MultiplayerGameResult) => void;
}

/**
 * Renders a vs-human multiplayer game using the *exact same* `InteractiveGame`
 * board component used for vs-bot games - just driven by a
 * `RemoteGameStateManager` instead of the local bot manager, via
 * `InteractiveGame`'s `externalManager`/`localPlayerId` props. This keeps
 * the board layout/behavior identical between game modes.
 */
export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ gameId, onExit, onGameEnd }) => {
  const { manager, localPlayerId, isLoading, error } = useMultiplayerManager(gameId);
  const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  // Bumped on every manager update so the waiting-room view (below) re-renders
  // as more players join or the host starts the game.
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!manager) return;
    const unsubscribe = manager.subscribe(() => forceRerender(n => n + 1));
    return unsubscribe;
  }, [manager]);

  useEffect(() => {
    let cancelled = false;
    getGameJoinInfo(gameId).then(info => {
      if (!cancelled && info) setMaxPlayers(info.maxPlayers);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const handleStartWaitingGame = useCallback(async () => {
    setIsStarting(true);
    try {
      await startWaitingGame(gameId);
    } catch (err) {
      console.error('Failed to start game:', err);
    } finally {
      setIsStarting(false);
    }
  }, [gameId]);

  const handleResign = useCallback(async () => {
    if (!manager) {
      onExit();
      return;
    }
    try {
      // Don't call onExit() here - the resulting state change (synced to
      // both players) fires onGameEnd below with resigned: true, which
      // shows the "match ended" overlay and exits from there instead.
      await manager.resign();
    } catch (err) {
      console.error('Failed to resign from multiplayer game:', err);
      onExit();
    }
  }, [manager, onExit]);

  if (isLoading) {
    return (
      <div className="multiplayer-game multiplayer-game__loading">
        <p>Loading game…</p>
      </div>
    );
  }

  if (error || !manager || !localPlayerId) {
    return (
      <div className="multiplayer-game multiplayer-game__loading">
        <p>{error ?? 'Failed to load game'}</p>
        <button onClick={onExit} type="button">Back to Menu</button>
      </div>
    );
  }

  const state = manager.getState();

  // vsmany "Create" games stay 'waiting' until either the host manually
  // starts (once >= 2 players have joined) or the game fills up to
  // max_players - show a lobby-style screen instead of the board until then.
  if (state.gameStatus === 'waiting') {
    const isHost = state.players[0]?.id === localPlayerId;
    return (
      <div className="multiplayer-game multiplayer-game__waiting">
        <p className="multiplayer-game__waiting-title">Waiting for players…</p>
        <ul className="multiplayer-game__waiting-list">
          {state.players.map(player => (
            <li key={player.id}>{player.id === localPlayerId ? `${player.name} (you)` : player.name}</li>
          ))}
        </ul>
        <p className="multiplayer-game__waiting-count">
          {state.players.length}{maxPlayers ? ` / ${maxPlayers}` : ''} joined
        </p>
        {isHost && state.players.length >= 2 && (
          <button onClick={handleStartWaitingGame} disabled={isStarting} type="button">
            {isStarting ? 'Starting…' : 'Start Game'}
          </button>
        )}
        {!isHost && <p className="multiplayer-game__waiting-hint">Waiting on the host to start…</p>}
        <button onClick={onExit} type="button">Back to Menu</button>
      </div>
    );
  }

  return (
    <InteractiveGame
      externalManager={manager}
      localPlayerId={localPlayerId}
      currentGameMode="multiplayer"
      onGameEnd={(winnerId, finalScores) => {
        const others = manager.getState().players.filter(p => p.id !== localPlayerId);
        // "Opponent" for the end-of-game meta text: the winner if the local
        // player lost, otherwise the highest-scoring other player - works
        // the same as before for 2-player games, and picks the most
        // relevant reference point for N-player games.
        const opponent =
          (winnerId && winnerId !== localPlayerId ? others.find(p => p.id === winnerId) : null) ||
          [...others].sort((a, b) => b.score - a.score)[0];
        onGameEnd?.({
          winnerId,
          localPlayerId,
          localScore: finalScores.human,
          opponentScore: finalScores.bot,
          opponentName: opponent?.name || 'Opponent',
          resigned: manager.wasAbandoned()
        });
      }}
      onResign={handleResign}
      onNavigateHome={onExit}
    />
  );
};
