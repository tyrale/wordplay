import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  createInviteGame,
  joinGameByInviteCode,
  findMatch,
  listMyActiveGames,
  getOpponentName,
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
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [readyGameId, setReadyGameId] = useState<string | null>(null);
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
    setOpponentName(null);
    setReadyGameId(null);
    try {
      const { gameId, inviteCode: code } = await createInviteGame();
      setInviteCode(code);
      // Wait for the opponent joining (status flips 'waiting' -> 'active'),
      // then load their name and stay on this screen until the host taps
      // Start rather than jumping straight into the game.
      const channel = supabase
        .channel(`lobby-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload: { new?: { status?: string } }) => {
            if (payload.new?.status === 'active') {
              supabase.removeChannel(channel);
              getOpponentName(gameId).then((name) => {
                setOpponentName(name || 'Your opponent');
                setReadyGameId(gameId);
              });
            }
          }
        )
        .subscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    if (readyGameId) onGameReady(readyGameId);
  }, [readyGameId, onGameReady]);

  const handleShareInvite = useCallback(async () => {
    if (!inviteCode) return;
    const shareData = {
      title: 'Join my Wordplay game',
      text: `Join my Wordplay game with code ${inviteCode}`
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteCode);
      }
    } catch {
      // User cancelled the share sheet or clipboard write failed - ignore.
    }
  }, [inviteCode]);

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
    setOpponentName(null);
    setReadyGameId(null);
  }, []);

  // Matches every other back arrow in the app: from a submenu it returns to
  // the last view (here, the lobby's own menu), and only leaves to the home
  // screen once already at the top-level view.
  const handleBack = useCallback(() => {
    if (view === 'menu') {
      onBack();
      return;
    }

    if (view === 'matchmaking') {
      handleCancelMatchmaking();
      return;
    }

    handleBackToMenu();
  }, [view, onBack, handleCancelMatchmaking, handleBackToMenu]);

  return (
    <div className="multiplayer-lobby">
      <button
        className="multiplayer-lobby__back"
        onClick={handleBack}
        aria-label={view === 'create' ? 'Close' : 'Back'}
      >
        {view === 'create' ? '×' : '←'}
      </button>

      {view === 'menu' && (
        <div className="multiplayer-lobby__menu">
          <div className="multiplayer-lobby__link-list">
            <button className="multiplayer-lobby__link" onClick={handleCreateInvite}>Create</button>
            <button className="multiplayer-lobby__link" onClick={() => setView('join')}>Join</button>
            <button className="multiplayer-lobby__link" onClick={handleFindMatch}>Random</button>
          </div>

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
          {isBusy && !inviteCode && <p>Creating game…</p>}
          {inviteCode && !opponentName && (
            <>
              <div className="multiplayer-lobby__code-row">
                <div className="multiplayer-lobby__code">{inviteCode}</div>
                <button
                  className="multiplayer-lobby__share"
                  onClick={handleShareInvite}
                  aria-label="Share invite code"
                >
                  ←
                </button>
              </div>
              <p className="multiplayer-lobby__hint">Waiting on player(s)…</p>
            </>
          )}
          {opponentName && (
            <>
              <p className="multiplayer-lobby__hint">{opponentName} joined!</p>
              <button onClick={handleStartGame}>Start</button>
            </>
          )}
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
