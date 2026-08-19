import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { MultiplayerGame } from '../MultiplayerGame';
import { useMultiplayerManager } from '../../hooks/useMultiplayerManager';
import { startWaitingGame } from '../../adapters/nativeMultiplayerAdapter';

jest.mock('../../hooks/useMultiplayerManager');
jest.mock('../../adapters/nativeMultiplayerAdapter', () => ({
  getGameJoinInfo: jest.fn().mockResolvedValue(null),
  startWaitingGame: jest.fn().mockResolvedValue(undefined)
}));

const mockedUseMultiplayerManager = useMultiplayerManager as jest.Mock;

function renderScreen(props: Partial<React.ComponentProps<typeof MultiplayerGame>> = {}) {
  const onExit = props.onExit ?? jest.fn();
  return {
    onExit,
    ...render(
      <ThemeProvider>
        <AlertProvider>
          <UnlockProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <MultiplayerGame gameId="game-1" onExit={onExit} {...props} />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </UnlockProvider>
        </AlertProvider>
      </ThemeProvider>
    )
  };
}

function makeManager(overrides: Partial<ReturnType<typeof buildState>> = {}) {
  const state = buildState(overrides);
  return {
    getState: () => state,
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    resign: jest.fn().mockResolvedValue(undefined),
    wasAbandoned: jest.fn().mockReturnValue(false)
  };
}

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    gameStatus: 'playing',
    currentWord: 'WORD',
    turnHistory: [],
    keyLetters: [],
    lockedLetters: [],
    lockedKeyLetters: [],
    currentTurn: 0,
    totalMoves: 0,
    gameStartTime: null,
    lastMoveTime: null,
    winner: null,
    config: { maxTurns: 20 },
    players: [
      { id: 'user-me', name: 'Me', isBot: false, score: 0, isCurrentPlayer: true },
      { id: 'user-them', name: 'Them', isBot: false, score: 0, isCurrentPlayer: false }
    ],
    ...overrides
  };
}

describe('native MultiplayerGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while the manager is initializing', () => {
    mockedUseMultiplayerManager.mockReturnValue({ manager: null, localPlayerId: null, isLoading: true, error: null });
    renderScreen();
    expect(screen.getByText('Loading game…')).toBeTruthy();
  });

  it('shows an error state with a back-to-menu link when the manager fails to load', () => {
    mockedUseMultiplayerManager.mockReturnValue({ manager: null, localPlayerId: null, isLoading: false, error: 'Unable to connect' });
    const { onExit } = renderScreen();

    expect(screen.getByText('Unable to connect')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to Menu'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows a waiting room (not the board) while the remote game status is "waiting"', () => {
    const manager = makeManager({ gameStatus: 'waiting' });
    mockedUseMultiplayerManager.mockReturnValue({ manager, localPlayerId: 'user-me', isLoading: false, error: null });

    renderScreen();

    expect(screen.getByText('Waiting for players…')).toBeTruthy();
    expect(screen.getByText('Me (you)')).toBeTruthy();
    expect(screen.getByText('Them')).toBeTruthy();
  });

  it('shows a Start button to the host once 2+ players have joined a waiting vsmany game', async () => {
    const manager = makeManager({ gameStatus: 'waiting' });
    mockedUseMultiplayerManager.mockReturnValue({ manager, localPlayerId: 'user-me', isLoading: false, error: null });

    renderScreen();

    const startButton = await screen.findByText('Start');
    fireEvent.press(startButton);

    await waitFor(() => expect(startWaitingGame).toHaveBeenCalledWith('game-1'));
  });

  it('does not show a Start button to a non-host in the waiting room', () => {
    const manager = makeManager({
      gameStatus: 'waiting',
      players: [
        { id: 'user-them', name: 'Them', isBot: false, score: 0, isCurrentPlayer: true },
        { id: 'user-me', name: 'Me', isBot: false, score: 0, isCurrentPlayer: false }
      ]
    });
    mockedUseMultiplayerManager.mockReturnValue({ manager, localPlayerId: 'user-me', isLoading: false, error: null });

    renderScreen();

    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.getByText('Waiting on the host to start…')).toBeTruthy();
  });

  it('resigns (not just exits) when cancelling from the waiting room', async () => {
    const manager = makeManager({ gameStatus: 'waiting' });
    mockedUseMultiplayerManager.mockReturnValue({ manager, localPlayerId: 'user-me', isLoading: false, error: null });
    const { onExit } = renderScreen();

    fireEvent.press(screen.getByText('Cancel'));

    await waitFor(() => expect(manager.resign).toHaveBeenCalledTimes(1));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('renders the real board (InteractiveGame) once the game is playing, showing both players via ScoreBar', async () => {
    const manager = makeManager({ gameStatus: 'playing' });
    mockedUseMultiplayerManager.mockReturnValue({ manager, localPlayerId: 'user-me', isLoading: false, error: null });

    renderScreen();

    // ScoreBar's `textTransform: 'uppercase'` is a style, not a change to
    // the underlying text node - queries match the raw string ("Me"), not
    // its rendered visual appearance.
    expect(await screen.findByText('Me')).toBeTruthy();
    expect(screen.getByText('Them')).toBeTruthy();
  });
});
