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
  // The menu screen is a two-step reveal: first vsone/vsmany, then (once
  // chosen) Create/Join/Random slides in in its place.
  const [menuStep, setMenuStep] = useState<'mode' | 'action'>('mode');
  const [isMenuStepExiting, setIsMenuStepExiting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<MatchmakingMode | null>(null);
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

  // Tapping vsone/vsmany on the first menu step: slide it out to the left,
  // then reveal the Create/Join/Random step sliding in from the right.
  const handleSelectMode = useCallback((mode: MatchmakingMode) => {
    setSelectedMode(mode);
    setIsMenuStepExiting(true);
    setTimeout(() => {
      setIsMenuStepExiting(false);
      setMenuStep('action');
    }, 300);
  }, []);

  // Tapping Create/Join/Random on the second menu step. Join's behavior
  // doesn't depend on mode - any invite code works regardless of the
  // created game's max_players - so it's ignored there.
  const handleActionSelect = useCallback((action: LobbyAction) => {
    const mode = selectedMode ?? 'vsone';
    if (action === 'create') {
      handleCreateInvite(mode);
    } else if (action === 'join') {
      setView('join');
    } else {
      handleFindMatch(mode);
    }
  }, [selectedMode, handleCreateInvite, handleFindMatch]);

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
    setMenuStep('mode');
    setSelectedMode(null);
  }, []);

  // Matches every other back arrow in the app: from a submenu it returns to
  // the last view (here, the lobby's own menu), and only leaves to the home
  // screen once already at the top-level view.
  const handleBack = useCallback(() => {
    if (view === 'menu') {
      if (menuStep === 'action') {
        // Back to the vsone/vsmany step rather than leaving the lobby.
        setMenuStep('mode');
        setSelectedMode(null);
        return;
      }
      onBack();
      return;
    }

    if (view === 'matchmaking') {
      handleCancelMatchmaking();
      return;
    }

    handleBackToMenu();
  }, [view, menuStep, onBack, handleCancelMatchmaking, handleBackToMenu]);

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
          {menuStep === 'mode' && (
            <div
              className={`multiplayer-lobby__link-list ${isMenuStepExiting ? 'multiplayer-lobby__link-list--exiting' : ''}`}
            >
              <button className="multiplayer-lobby__link" onClick={() => handleSelectMode('vsone')}>
                <span className="multiplayer-lobby__vs-text">vs</span>one
              </button>
              <button className="multiplayer-lobby__link" onClick={() => handleSelectMode('vsmany')}>
                <span className="multiplayer-lobby__vs-text">vs</span>many
              </button>
            </div>
          )}

          {menuStep === 'action' && (
            <div className="multiplayer-lobby__link-list multiplayer-lobby__link-list--entering">
              <button className="multiplayer-lobby__link" onClick={() => handleActionSelect('create')}>Create</button>
              <button className="multiplayer-lobby__link" onClick={() => handleActionSelect('join')}>Join</button>
              <button className="multiplayer-lobby__link" onClick={() => handleActionSelect('random')}>Random</button>
            </div>
          )}

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
