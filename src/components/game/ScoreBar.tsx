import React from 'react';
import type { Player } from '../../../packages/engine/interfaces';
import { getBotDisplayName } from '../../data/botRegistry';
import { getDisplayName as getVanityName, hasConfirmedDisplayName } from '../../adapters/supabaseAuthAdapter';
import './ScoreBar.css';

export interface ScoreBarProps {
  players: Player[];
  /** Bot registry id for the 'bot' player, used to resolve a friendly display name */
  botId?: string;
  /** vs-human multiplayer: show each player's vanity name instead of P1/P2. */
  isMultiplayer?: boolean;
  /** Current round/turn number, shown as "round x" at the bottom of the stack. */
  currentRound?: number;
  /** Authenticated player id treated as "the local player" in multiplayer games, used to identify which row is tappable for renaming. */
  localPlayerId?: string;
  /** Called when the local player taps their own name, to open the rename overlay. */
  onOwnNameTap?: () => void;
  className?: string;
}

function getDisplayName(player: Player, humanIndex: number, botId?: string, isMultiplayer?: boolean): string {
  if (player.isBot) {
    return player.id === 'bot' && botId ? getBotDisplayName(botId) : player.name;
  }
  // Own display name always comes from local storage (kept in sync with the
  // server in multiplayer via setDisplayName), so a rename is reflected
  // immediately without waiting on a server refetch.
  if (hasConfirmedDisplayName() && (isMultiplayer ? true : humanIndex === 0)) {
    return getVanityName();
  }
  if (isMultiplayer) {
    return player.name;
  }
  return `P${humanIndex + 1}`;
}

const PlayerRow: React.FC<{ displayName: string; player: Player; isSelf: boolean; onTap?: () => void }> = ({ displayName, player, isSelf, onTap }) => (
  <div
    className={`score-bar__player ${player.isCurrentPlayer ? 'score-bar__player--active' : ''} ${isSelf && onTap ? 'score-bar__player--self' : ''}`}
    onClick={isSelf ? onTap : undefined}
    role={isSelf && onTap ? 'button' : undefined}
    tabIndex={isSelf && onTap ? 0 : undefined}
  >
    <span className="score-bar__name">{displayName}</span>
    <span className="score-bar__score">{player.score === 0 ? '-' : player.score}</span>
  </div>
);

export const ScoreBar: React.FC<ScoreBarProps> = ({ players, botId, isMultiplayer = false, currentRound, localPlayerId, onOwnNameTap, className = '' }) => {
  if (players.length === 0) return null;

  // All players stacked together on the left, in a single column.
  let humanIndex = 0;

  return (
    <div className={`score-bar ${className}`.trim()}>
      <div className="score-bar__stack">
        {players.map(player => {
          const displayName = getDisplayName(player, humanIndex, botId, isMultiplayer);
          // In multiplayer, "self" is the authenticated localPlayerId; in
          // vs-bot/tutorial play, the first non-bot player is always self.
          const isSelf = !player.isBot && (localPlayerId ? player.id === localPlayerId : humanIndex === 0);
          if (!player.isBot) humanIndex += 1;
          return (
            <PlayerRow
              key={player.id}
              player={player}
              displayName={displayName}
              isSelf={isSelf}
              onTap={onOwnNameTap}
            />
          );
        })}
        {typeof currentRound === 'number' && (
          <div className="score-bar__round">round {currentRound}</div>
        )}
      </div>
    </div>
  );
};
