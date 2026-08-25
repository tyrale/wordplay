import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { MultiplayerLobby } from '../MultiplayerLobby';
import {
  createInviteGame,
  joinGameByInviteCode,
  findMatch,
  listMyActiveGames,
  cancelGame,
  getGameJoinInfo,
  getOpponentName
} from '../../adapters/nativeMultiplayerAdapter';
import { hasConfirmedDisplayName } from '../../adapters/nativeAuthAdapter';
import { supabase } from '../../lib/supabase';

jest.mock('../../adapters/nativeMultiplayerAdapter', () => ({
  createInviteGame: jest.fn(),
  joinGameByInviteCode: jest.fn(),
  findMatch: jest.fn(),
  listMyActiveGames: jest.fn().mockResolvedValue([]),
  getOpponentName: jest.fn(),
  startWaitingGame: jest.fn(),
  getGameJoinInfo: jest.fn().mockResolvedValue({ status: 'waiting', maxPlayers: 2, players: [] }),
  cancelGame: jest.fn().mockResolvedValue(undefined)
}));

function getRegisteredAppStateListener(): (state: string) => void {
  const call = (AppState.addEventListener as jest.Mock).mock.calls.find(([event]) => event === 'change');
  return call?.[1];
}

jest.mock('../../adapters/nativeAuthAdapter', () => ({
  getDisplayName: jest.fn().mockReturnValue('Player1234'),
  setDisplayName: jest.fn().mockResolvedValue(undefined),
  hasConfirmedDisplayName: jest.fn().mockResolvedValue(true),
  markDisplayNameConfirmed: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    }),
    removeChannel: jest.fn()
  }
}));

function renderLobby(props: Partial<React.ComponentProps<typeof MultiplayerLobby>> = {}) {
  const onGameReady = props.onGameReady ?? jest.fn();
  const onBack = props.onBack ?? jest.fn();
  return {
    onGameReady,
    onBack,
    ...render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <MultiplayerLobby onGameReady={onGameReady} onBack={onBack} {...props} />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    )
  };
}

describe('native MultiplayerLobby', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listMyActiveGames as jest.Mock).mockResolvedValue([]);
    (hasConfirmedDisplayName as jest.Mock).mockResolvedValue(true);
    (getGameJoinInfo as jest.Mock).mockResolvedValue({ status: 'waiting', maxPlayers: 2, players: [] });
    (supabase.channel as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    });
    (AppState as unknown as { currentState: string }).currentState = 'active';
  });

  it('shows the vsone/vsmany mode menu first', async () => {
    renderLobby();
    expect(await screen.findByText('one')).toBeTruthy();
    expect(screen.getByText('many')).toBeTruthy();
  });

  it('reveals Create/Join/Random after picking a mode', async () => {
    renderLobby();
    fireEvent.press(await screen.findByText('one'));

    expect(await screen.findByText('Create')).toBeTruthy();
    expect(screen.getByText('Join')).toBeTruthy();
    expect(screen.getByText('Random')).toBeTruthy();
  });

  it('going back from the action step returns to the mode step, not out of the lobby', async () => {
    const { onBack } = renderLobby();
    fireEvent.press(await screen.findByText('one'));
    await screen.findByText('Create');

    fireEvent.press(screen.getByLabelText('Back'));

    expect(await screen.findByText('one')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('going back from the top-level mode step exits the lobby', async () => {
    const { onBack } = renderLobby();
    await screen.findByText('one');

    fireEvent.press(screen.getByLabelText('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('creating a vsone invite shows the invite code once created', async () => {
    (createInviteGame as jest.Mock).mockResolvedValue({ gameId: 'game-1', inviteCode: 'ABC123' });
    renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Create'));

    expect(await screen.findByText('ABC123')).toBeTruthy();
    expect(createInviteGame).toHaveBeenCalledWith(expect.objectContaining({ maxPlayers: 2 }));
  });

  it('picks up the opponent joining via a poll tick, not just the realtime channel (backgrounding resilience)', async () => {
    (createInviteGame as jest.Mock).mockResolvedValue({ gameId: 'game-1', inviteCode: 'ABC123' });
    (getGameJoinInfo as jest.Mock).mockResolvedValue({ status: 'waiting', maxPlayers: 2, players: [] });
    renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Create'));
    await waitFor(() => expect(screen.getByText('ABC123')).toBeTruthy());

    // The realtime channel never fires (simulating a dead/suspended
    // websocket) - only the poll fallback (a real 4-second interval, per
    // this screen's own `checkInviteStatus` wiring) should notice the
    // opponent, so this waits for a real tick rather than faking timers.
    (getGameJoinInfo as jest.Mock).mockResolvedValue({ status: 'active', maxPlayers: 2, players: [] });
    (getOpponentName as jest.Mock).mockResolvedValue('Bob');

    await waitFor(() => expect(screen.getByText(/Bob joined/)).toBeTruthy(), { timeout: 6000 });
  }, 8000);

  it('immediately re-checks a pending invite when the app returns to the foreground', async () => {
    (AppState as unknown as { currentState: string }).currentState = 'background';
    (createInviteGame as jest.Mock).mockResolvedValue({ gameId: 'game-1', inviteCode: 'ABC123' });
    (getGameJoinInfo as jest.Mock).mockResolvedValue({ status: 'waiting', maxPlayers: 2, players: [] });
    renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Create'));
    await waitFor(() => expect(screen.getByText('ABC123')).toBeTruthy());

    (getGameJoinInfo as jest.Mock).mockResolvedValue({ status: 'active', maxPlayers: 2, players: [] });
    (getOpponentName as jest.Mock).mockResolvedValue('Alice');

    await act(async () => {
      getRegisteredAppStateListener()('active');
    });

    await waitFor(() => expect(screen.getByText(/Alice joined/)).toBeTruthy());
  });

  it('does not re-check anything on foreground once no invite is pending', async () => {
    (AppState as unknown as { currentState: string }).currentState = 'background';
    renderLobby();
    await screen.findByText('one');

    const callCountBefore = (getGameJoinInfo as jest.Mock).mock.calls.length;
    await act(async () => {
      getRegisteredAppStateListener()('active');
    });

    expect((getGameJoinInfo as jest.Mock).mock.calls.length).toBe(callCountBefore);
  });

  it('creating a vsmany invite requests 8 max players', async () => {
    (createInviteGame as jest.Mock).mockResolvedValue({ gameId: 'game-2', inviteCode: 'XYZ789' });
    renderLobby();

    fireEvent.press(await screen.findByText('many'));
    fireEvent.press(await screen.findByText('Create'));

    await screen.findByText('XYZ789');
    expect(createInviteGame).toHaveBeenCalledWith(expect.objectContaining({ maxPlayers: 8 }));
  });

  it('joining by code calls joinGameByInviteCode and reports the game as ready', async () => {
    (joinGameByInviteCode as jest.Mock).mockResolvedValue('game-3');
    const { onGameReady } = renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Join'));

    const input = await screen.findByPlaceholderText('Enter code');
    fireEvent.changeText(input, 'code12');
    fireEvent.press(screen.getByText('Join'));

    await waitFor(() => expect(joinGameByInviteCode).toHaveBeenCalledWith('CODE12'));
    expect(onGameReady).toHaveBeenCalledWith('game-3');
  });

  it('shows a join error message without crashing when the code is invalid', async () => {
    (joinGameByInviteCode as jest.Mock).mockRejectedValue(new Error('Failed to join game with that code'));
    renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Join'));
    fireEvent.changeText(await screen.findByPlaceholderText('Enter code'), 'BADCOD');
    fireEvent.press(screen.getByText('Join'));

    expect(await screen.findByText('Failed to join game with that code')).toBeTruthy();
  });

  it('starts random matchmaking and shows the searching state', async () => {
    (findMatch as jest.Mock).mockResolvedValue({ cancel: jest.fn() });
    renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Random'));

    expect(await screen.findByText('Finding a Match…')).toBeTruthy();
    expect(findMatch).toHaveBeenCalledWith(expect.any(Function), 'vsone', expect.any(Object));
  });

  it('cancelling matchmaking calls the handle and returns to the menu', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    (findMatch as jest.Mock).mockResolvedValue({ cancel });
    renderLobby();

    fireEvent.press(await screen.findByText('one'));
    fireEvent.press(await screen.findByText('Random'));
    await screen.findByText('Finding a Match…');

    fireEvent.press(screen.getByText('Cancel Search'));

    await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
    // Returns to the menu view, but web's own handleCancelMatchmaking
    // doesn't reset menuStep either - it lands back on the action step
    // (Create/Join/Random) it came from, not the top-level mode step.
    expect(await screen.findByText('Create')).toBeTruthy();
  });

  it('lists active games and lets the player resume one directly', async () => {
    (listMyActiveGames as jest.Mock).mockResolvedValue([
      { gameId: 'game-9', opponentName: 'Rival', opponentNames: ['Rival'], isMyTurn: true, status: 'active' }
    ]);
    const { onGameReady } = renderLobby();

    fireEvent.press(await screen.findByText('Rival'));
    expect(onGameReady).toHaveBeenCalledWith('game-9');
  });

  it('cancelling an active game removes it from the list without navigating', async () => {
    (listMyActiveGames as jest.Mock).mockResolvedValue([
      { gameId: 'game-9', opponentName: 'Rival', opponentNames: ['Rival'], isMyTurn: true, status: 'active' }
    ]);
    const { onGameReady } = renderLobby();

    fireEvent.press(await screen.findByLabelText('Cancel game'));

    await waitFor(() => expect(cancelGame).toHaveBeenCalledWith('game-9'));
    await waitFor(() => expect(screen.queryByText('Rival')).toBeNull());
    expect(onGameReady).not.toHaveBeenCalled();
  });

  it('shows the name prompt when the display name has not been confirmed yet', async () => {
    (hasConfirmedDisplayName as jest.Mock).mockResolvedValue(false);
    renderLobby();

    expect(await screen.findByText('Pick a name')).toBeTruthy();
  });

  it('does not show the name prompt once the display name is already confirmed', async () => {
    (hasConfirmedDisplayName as jest.Mock).mockResolvedValue(true);
    renderLobby();

    await screen.findByText('one');
    expect(screen.queryByText('Pick a name')).toBeNull();
  });
});
