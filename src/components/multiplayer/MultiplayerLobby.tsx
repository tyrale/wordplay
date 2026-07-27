import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  createInviteGame,
  joinGameByInviteCode,
  findMatch,
  listMyActiveGames,
  getOpponentName,
  startWaitingGame,
  getGameJoinInfo,
  type MatchmakingHandle,
  type MatchmakingMode,
  type ActiveGameSummary,
  type GameJoinInfo
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
type LobbyAction = 'create' | 'join' | 'random';

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
  // Which top-level action (Create/Join/Random) is currently showing its
  // "vs one" / "vs many" submenu on the menu screen.
  const [selectedAction, setSelectedAction] = useState<LobbyAction | null>(null);
  const [createMode, setCreateMode] = useState<MatchmakingMode>('vsone');
  const [createGameId, setCreateGameId] = useState<string | null>(null);
  // Live list of joined players for a vsmany "Create" game, shown while it's
  // still 'waiting' for the host to manually start it.
  const [joinedPlayers, setJoinedPlayers] = useState<GameJoinInfo['players']>([]);

  useEffect(() => {
    listMyActiveGames().then(setActiveGames).catch(() => setActiveGames([]));
  }, []);

  const handleNameSubmit = useCallback(async (name: string) => {
    await setDisplayName(name);
    markDisplayNameConfirmed();
    setShowNamePrompt(false);
  }, []);

  const handleCreateInvite = useCallback(async (mode: MatchmakingMode) => {
    setView('create');
    setError(null);
    setIsBusy(true);
    setOpponentName(null);
    setReadyGameId(null);
    setCreateMode(mode);
    setCreateGameId(null);
    setJoinedPlayers([]);
    try {
      const { gameId, inviteCode: code } = await createInviteGame({ maxPlayers: mode === 'vsmany' ? 8 : 2 });
      setInviteCode(code);
      setCreateGameId(gameId);
      getGameJoinInfo(gameId).then((info) => {
        if (info) setJoinedPlayers(info.players);
      });
      // vsone fills up (2/2) and activates as soon as the opponent joins -
      // wait for that, then load their name and stay on this screen until
      // the host taps Start rather than jumping straight into the game.
      // vsmany stays 'waiting' until the host manually starts it (see
      // handleStartVsManyGame) or it fills up to 8, so we just track the
      // live joined-players list until either happens.
      const channel = supabase
        .channel(`lobby-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload: { new?: { status?: string } }) => {
            if (payload.new?.status === 'active') {
              supabase.removeChannel(channel);
              if (mode === 'vsone') {
                getOpponentName(gameId).then((name) => {
                  setOpponentName(name || 'Your opponent');
                  setReadyGameId(gameId);
                });
              } else {
                // Filled up to max_players automatically - jump straight in.
                onGameReady(gameId);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
          () => {
            getGameJoinInfo(gameId).then((info) => {
              if (info) setJoinedPlayers(info.players);
            });
          }
        )
        .subscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsBusy(false);
    }
  }, [onGameReady]);

  const handleStartGame = useCallback(() => {
    if (readyGameId) onGameReady(readyGameId);
  }, [readyGameId, onGameReady]);

  const handleStartVsManyGame = useCallback(async () => {
    if (!createGameId) return;
    setIsBusy(true);
    setError(null);
    try {
      await startWaitingGame(createGameId);
      onGameReady(createGameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsBusy(false);
    }
  }, [createGameId, onGameReady]);

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

  const handleFindMatch = useCallback(async (mode: MatchmakingMode) => {
    setView('matchmaking');
    setError(null);
    setIsBusy(true);
    try {
      const handle = await findMatch((gameId) => {
        onGameReady(gameId);
      }, mode);
      matchmakingHandleRef.current = handle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for a match');
    } finally {
      setIsBusy(false);
    }
  }, [onGameReady]);

  // Tapping a "vs one"/"vs many" submenu option under Create/Join/Random.
  // Join's behavior doesn't depend on mode - any invite code works
  // regardless of the created game's max_players - so it's ignored there.
  const handleActionSelect = useCallback((action: LobbyAction, mode: MatchmakingMode) => {
    setSelectedAction(null);
    if (action === 'create') {
      handleCreateInvite(mode);
    } else if (action === 'join') {
      setView('join');
    } else {
      handleFindMatch(mode);
    }
  }, [handleCreateInvite, handleFindMatch]);

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
    setSelectedAction(null);
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
            {([
              { action: 'create' as const, label: 'Create' },
              { action: 'join' as const, label: 'Join' },
              { action: 'random' as const, label: 'Random' }
            ]).map(({ action, label }) => (
              <div key={action} className="multiplayer-lobby__action-group">
                <button
                  className="multiplayer-lobby__link"
                  onClick={() => setSelectedAction(prev => (prev === action ? null : action))}
                  aria-expanded={selectedAction === action}
                >
                  {label}
                </button>
                {selectedAction === action && (
                  <div className="multiplayer-lobby__submenu">
                    <button
                      className="multiplayer-lobby__submenu-link"
                      onClick={() => handleActionSelect(action, 'vsone')}
                    >
                      <span className="multiplayer-lobby__vs-text">vs</span> one
                    </button>
                    <button
                      className="multiplayer-lobby__submenu-link"
                      onClick={() => handleActionSelect(action, 'vsmany')}
                    >
                      <span className="multiplayer-lobby__vs-text">vs</span> many
                    </button>
                  </div>
                )}
              </div>
            ))}
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
          {inviteCode && createMode === 'vsone' && !opponentName && (
            <>
              <p className="multiplayer-lobby__share-label">Share this:</p>
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
          {opponentName && createMode === 'vsone' && (
            <>
              <p className="multiplayer-lobby__hint">{opponentName} joined!</p>
              <button className="multiplayer-lobby__link" onClick={handleStartGame}>Start</button>
            </>
          )}
          {inviteCode && createMode === 'vsmany' && (
            <>
              <p className="multiplayer-lobby__share-label">Share this:</p>
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
              <ul className="multiplayer-lobby__joined-list">
                {joinedPlayers.map((player) => (
                  <li key={player.id}>{player.name}</li>
                ))}
              </ul>
              <p className="multiplayer-lobby__hint">{joinedPlayers.length} / 8 joined</p>
              <button
                className="multiplayer-lobby__link"
                onClick={handleStartVsManyGame}
                disabled={isBusy || joinedPlayers.length < 2}
              >
                {isBusy ? 'Starting…' : 'Start'}
              </button>
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
          <button
            className="multiplayer-lobby__link"
            onClick={handleJoin}
            disabled={isBusy || joinCodeInput.trim().length === 0}
          >
            {isBusy ? 'Joining…' : 'Join'}
          </button>
          <button className="multiplayer-lobby__link" onClick={handleBackToMenu}>Cancel</button>
        </div>
      )}

      {view === 'matchmaking' && (
        <div className="multiplayer-lobby__panel">
          <h3>Finding a Match…</h3>
          <p className="multiplayer-lobby__hint">This may take a moment.</p>
          <button className="multiplayer-lobby__link" onClick={handleCancelMatchmaking}>Cancel Search</button>
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
