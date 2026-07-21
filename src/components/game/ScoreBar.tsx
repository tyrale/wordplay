import React from 'react';
import type { Player } from '../../../packages/engine/interfaces';
import { getBotDisplayName } from '../../data/botRegistry';
import './ScoreBar.css';

export interface ScoreBarProps {
  players: Player[];
  /** Bot registry id for the 'bot' player, used to resolve a friendly display name */
  botId?: string;
  /** vs-human multiplayer: show each player's vanity name instead of P1/P2. */
  isMultiplayer?: boolean;
  className?: string;
}

function getDisplayName(player: Player, humanIndex: number, botId?: string, isMultiplayer?: boolean): string {
  if (player.isBot) {
    return player.id === 'bot' && botId ? getBotDisplayName(botId) : player.name;
  }
  if (isMultiplayer) {
    return player.name;
  }
  return `P${humanIndex + 1}`;
}

const PlayerRow: React.FC<{ displayName: string; player: Player }> = ({ displayName, player }) => (
  <div className={`score-bar__player ${player.isCurrentPlayer ? 'score-bar__player--active' : ''}`}>
    <span className="score-bar__name">{displayName}</span>
    <span className="score-bar__score">{player.score === 0 ? '-' : player.score}</span>
  </div>
);

export const ScoreBar: React.FC<ScoreBarProps> = ({ players, botId, isMultiplayer = false, className = '' }) => {
  if (players.length === 0) return null;

  // Bots stacked on the left, humans stacked on the right
  const leftPlayers = players.filter(p => p.isBot);
  const rightPlayers = players.filter(p => !p.isBot);

  return (
    <div className={`score-bar ${className}`.trim()}>
      <div className="score-bar__side score-bar__side--left">
        {leftPlayers.map(player => (
          <PlayerRow key={player.id} player={player} displayName={getDisplayName(player, 0, botId, isMultiplayer)} />
        ))}
      </div>
      <div className="score-bar__side score-bar__side--right">
        {rightPlayers.map((player, index) => (
          <PlayerRow key={player.id} player={player} displayName={getDisplayName(player, index, botId, isMultiplayer)} />
        ))}
      </div>
    </div>
  );
};
