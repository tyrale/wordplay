import React, { useCallback } from 'react';
import { InteractiveGame } from '../game/InteractiveGame';
import { useMultiplayerManager } from '../../hooks/useMultiplayerManager';
import './MultiplayerGame.css';

export interface MultiplayerGameProps {
  gameId: string;
  onExit: () => void;
  onGameEnd?: (winnerId: string | null, localPlayerId: string | null) => void;
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
      await manager.resign();
    } finally {
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
      onGameEnd={(winnerId) => onGameEnd?.(winnerId, localPlayerId)}
      onResign={handleResign}
      onNavigateHome={onExit}
    />
  );
};
