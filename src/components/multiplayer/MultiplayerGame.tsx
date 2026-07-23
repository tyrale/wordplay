import React, { useCallback } from 'react';
import { InteractiveGame } from '../game/InteractiveGame';
import { useMultiplayerManager } from '../../hooks/useMultiplayerManager';
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

  return (
    <InteractiveGame
      externalManager={manager}
      localPlayerId={localPlayerId}
      currentGameMode="multiplayer"
      onGameEnd={(winnerId, finalScores) => {
        const opponent = manager.getState().players.find(p => p.id !== localPlayerId);
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
