import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  createInviteGame,
  joinGameByInviteCode,
  findMatch,
  listMyActiveGames,
  type MatchmakingHandle,
  type ActiveGameSummary
} from '../../adapters/supabaseMultiplayerAdapter';
import { supabase } from '../../lib/supabase';
import { getDisplayName, setDisplayName, hasConfirmedDisplayName, markDisplayNameConfirmed } from '../../adapters/supabaseAuthAdapter';
import { NamePromptOverlay } from './NamePromptOverlay';
import './MultiplayerLobby.css';

export interface MultiplayerLobbyProps {
  onGameReady: (gameId: string) => void;
  onBack: () => void;
}

type LobbyView = 'menu' | 'create' | 'join' | 'matchmaking';

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onGameReady, onBack }) => {
  const [view, setView] = useState<LobbyView>('menu');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(!hasConfirmedDisplayName());
  const [activeGames, setActiveGames] = useState<ActiveGameSummary[]>([]);
  const matchmakingHandleRef = useRef<MatchmakingHandle | null>(null);

  useEffect(() => {
    listMyActiveGames().then(setActiveGames).catch(() => setActiveGames([]));
  }, []);

  const handleNameSubmit = useCallback(async (name: string) => {
    await setDisplayName(name);
    markDisplayNameConfirmed();
    setShowNamePrompt(false);
  }, []);

  const handleCreateInvite = useCallback(async () => {
    setView('create');
    setError(null);
    setIsBusy(true);
    try {
      const { gameId, inviteCode: code } = await createInviteGame();
      setInviteCode(code);
      // Wait for the opponent joining (status flips 'waiting' -> 'active').
      const channel = supabase
        .channel(`lobby-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload: { new?: { status?: string } }) => {
            if (payload.new?.status === 'active') {
              supabase.removeChannel(channel);
              onGameReady(gameId);
            }
          }
        )
        .subscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsBusy(false);
    }
  }, [onGameReady]);

  const handleJoin = useCallback(async () => {
    setError(null);
    setIsBusy(true);
    try {
      const gameId = await joinGameByInviteCode(joinCodeInput);
      onGameReady(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setIsBusy(false);
    }
  }, [joinCodeInput, onGameReady]);

  const handleFindMatch = useCallback(async () => {
    setView('matchmaking');
    setError(null);
    setIsBusy(true);
    try {
      const handle = await findMatch((gameId) => {
        onGameReady(gameId);
      });
      matchmakingHandleRef.current = handle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for a match');
    } finally {
      setIsBusy(false);
    }
  }, [onGameReady]);

  const handleCancelMatchmaking = useCallback(async () => {
    await matchmakingHandleRef.current?.cancel();
    matchmakingHandleRef.current = null;
    setView('menu');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setView('menu');
    setError(null);
    setInviteCode(null);
  }, []);

  return (
    <div className="multiplayer-lobby">
      <button className="multiplayer-lobby__back" onClick={onBack} aria-label="Back to main menu">←</button>

      {view === 'menu' && (
        <div className="multiplayer-lobby__menu">
          <button className="multiplayer-lobby__link" onClick={handleCreateInvite}>Create Invite</button>
          <button className="multiplayer-lobby__link" onClick={() => setView('join')}>Join with Code</button>
          <button className="multiplayer-lobby__link" onClick={handleFindMatch}>Find Random Match</button>

          {activeGames.length > 0 && (
            <div className="multiplayer-lobby__games">
              <p className="multiplayer-lobby__games-title">Games in Progress</p>
              {activeGames.map((game) => (
                <button
                  key={game.gameId}
                  className="multiplayer-lobby__game-link"
                  onClick={() => onGameReady(game.gameId)}
                >
                  {game.opponentName}
                  <span className="multiplayer-lobby__game-status">
                    {game.status === 'waiting' ? 'waiting' : game.isMyTurn ? 'your turn' : 'waiting'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="multiplayer-lobby__panel">
          <h3>Invite a Friend</h3>
          {isBusy && !inviteCode && <p>Creating game…</p>}
          {inviteCode && (
            <>
              <p>Share this code:</p>
              <div className="multiplayer-lobby__code">{inviteCode}</div>
              <p className="multiplayer-lobby__hint">Waiting for your opponent to join…</p>
            </>
          )}
          <button onClick={handleBackToMenu}>Cancel</button>
        </div>
      )}

      {view === 'join' && (
        <div className="multiplayer-lobby__panel">
          <h3>Join a Game</h3>
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={6}
            autoFocus
          />
          <button onClick={handleJoin} disabled={isBusy || joinCodeInput.trim().length === 0}>
            {isBusy ? 'Joining…' : 'Join'}
          </button>
          <button onClick={handleBackToMenu}>Cancel</button>
        </div>
      )}

      {view === 'matchmaking' && (
        <div className="multiplayer-lobby__panel">
          <h3>Finding a Match…</h3>
          <p className="multiplayer-lobby__hint">This may take a moment.</p>
          <button onClick={handleCancelMatchmaking}>Cancel Search</button>
        </div>
      )}

      {error && (
        <div className="multiplayer-lobby__error" role="alert">
          {error}
        </div>
      )}

      <NamePromptOverlay
        isVisible={showNamePrompt}
        defaultName={getDisplayName()}
        onSubmit={handleNameSubmit}
      />
    </div>
  );
};
