import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { ScoreBar } from '../ScoreBar';
import type { Player } from '@wordplay/engine/interfaces';
import { hasConfirmedDisplayName, getDisplayName } from '../../adapters/nativeAuthAdapter';
import { defaultTheme } from '@wordplay/theme/theme';

jest.mock('../../adapters/nativeAuthAdapter', () => ({
  hasConfirmedDisplayName: jest.fn().mockResolvedValue(false),
  getDisplayName: jest.fn().mockReturnValue('MyVanityName')
}));

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'P1',
    score: 0,
    isBot: false,
    isCurrentPlayer: false,
    ...overrides
  } as Player;
}

function renderScoreBar(props: Partial<React.ComponentProps<typeof ScoreBar>>) {
  return render(
    <ThemeProvider>
      <ScoreBar players={[]} {...props} />
    </ThemeProvider>
  );
}

describe('native ScoreBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasConfirmedDisplayName as jest.Mock).mockResolvedValue(false);
  });

  it('renders nothing when there are no players', () => {
    renderScoreBar({ players: [] });
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('vs-bot default: shows the first human as P1 and the bot with its display name', async () => {
    renderScoreBar({
      players: [player({ id: 'human', name: 'human' }), player({ id: 'bot', name: 'bot', isBot: true })],
      botDisplayName: 'BasicBot'
    });

    expect(await screen.findByText('P1')).toBeTruthy();
    expect(screen.getByText('BasicBot')).toBeTruthy();
  });

  it('vs-bot: falls back to the raw bot name if no botDisplayName override is given', async () => {
    renderScoreBar({
      players: [player({ id: 'human', name: 'human' }), player({ id: 'bot', name: 'RawBotName', isBot: true })]
    });

    expect(await screen.findByText('RawBotName')).toBeTruthy();
  });

  it('multiplayer: shows each player\'s real name, not P1/P2, once isMultiplayer is set', async () => {
    renderScoreBar({
      players: [player({ id: 'user-a', name: 'Alice' }), player({ id: 'user-b', name: 'Bob' })],
      isMultiplayer: true,
      localPlayerId: 'user-a'
    });

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.queryByText('P1')).toBeNull();
    expect(screen.queryByText('P2')).toBeNull();
  });

  it('multiplayer: uses the confirmed vanity display name for the local player once confirmed, not the server-synced name', async () => {
    (hasConfirmedDisplayName as jest.Mock).mockResolvedValue(true);
    renderScoreBar({
      players: [player({ id: 'user-a', name: 'StaleServerName' }), player({ id: 'user-b', name: 'Bob' })],
      isMultiplayer: true,
      localPlayerId: 'user-a'
    });

    expect(await screen.findByText('MyVanityName')).toBeTruthy();
    expect(screen.queryByText('StaleServerName')).toBeNull();
    // The *other* player's name is unaffected by the local vanity override.
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('multiplayer: tapping your own name fires onOwnNameTap; tapping the opponent does not', async () => {
    const onOwnNameTap = jest.fn();
    renderScoreBar({
      players: [player({ id: 'user-a', name: 'Alice' }), player({ id: 'user-b', name: 'Bob' })],
      isMultiplayer: true,
      localPlayerId: 'user-a',
      onOwnNameTap
    });

    await screen.findByText('Alice');
    fireEvent.press(screen.getByLabelText('Rename yourself (currently Alice)'));
    expect(onOwnNameTap).toHaveBeenCalledTimes(1);

    expect(screen.queryByLabelText(/Rename yourself \(currently Bob\)/)).toBeNull();
  });

  it('shows scores, using "-" for a zero score', async () => {
    renderScoreBar({
      players: [player({ id: 'p1', name: 'p1', score: 0 }), player({ id: 'p2', name: 'p2', isBot: true, score: 12 })]
    });

    await waitFor(() => expect(screen.getByText('-')).toBeTruthy());
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('shows the round number when provided', async () => {
    renderScoreBar({ players: [player()], currentRound: 3 });
    expect(await screen.findByText('round 3')).toBeTruthy();
  });

  it('renders the score value at the heaviest available font weight (900)', async () => {
    renderScoreBar({
      players: [player({ id: 'p1', name: 'p1', score: 12 })]
    });

    const score = await screen.findByText('12');
    const flattenedStyle = [score.props.style].flat();
    expect(flattenedStyle).toEqual(expect.arrayContaining([expect.objectContaining({ fontWeight: '900' })]));
  });

  it('flips player score, bot score, and round text color when dark mode (inverted) is on', async () => {
    await AsyncStorage.setItem('wordplay-inverted', 'true');

    renderScoreBar({
      players: [player({ id: 'p1', name: 'p1', score: 5 }), player({ id: 'bot', name: 'bot', isBot: true, score: 12 })],
      currentRound: 2
    });

    const score = await screen.findByText('12');
    const round = await screen.findByText('round 2');

    const invertedTextColor = defaultTheme.colors.background;
    expect([score.props.style].flat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: invertedTextColor })])
    );
    expect([round.props.style].flat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: invertedTextColor })])
    );
  });
});
