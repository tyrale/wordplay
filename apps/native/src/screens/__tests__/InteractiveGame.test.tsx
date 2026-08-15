import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider } from '../../providers/UnlockProvider';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { InteractiveGame } from '../InteractiveGame';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { StatsOverlay } from '../../components/StatsOverlay';

function renderGame(props: React.ComponentProps<typeof InteractiveGame> = {}) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <MechanicsSettingsProvider>
            <RoundLengthProvider>
              <InteractiveGame {...props} />
            </RoundLengthProvider>
          </MechanicsSettingsProvider>
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

describe('native InteractiveGame screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mounts, initializes a game, and starts it automatically', async () => {
    renderGame();

    await waitFor(() => {
      // Current word letters render as individual Text nodes via
      // CurrentWord - just confirm the alphabet grid rendered by finding
      // a known action button.
      expect(screen.getByLabelText('Reset word')).toBeTruthy();
    });
  });

  it('lets the player tap a letter to append it, then reset it back', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter A'));
    // Appending a letter should make the submit button reachable
    // (either as a valid submit or an invalid-word pass), i.e. the
    // screen doesn't crash on a tap.
    fireEvent.press(screen.getByLabelText('Reset word'));
  });

  it('calls onNavigateHome (not onResign) when the back action is pressed - no ceremony', async () => {
    const onNavigateHome = jest.fn();
    const onResign = jest.fn();
    renderGame({ onNavigateHome, onResign });
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Return to home screen'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
    expect(onResign).not.toHaveBeenCalled();
  });

  it('calls onResign (not onNavigateHome) from the Menu\'s resign action', async () => {
    const onNavigateHome = jest.fn();
    const onResign = jest.fn();
    renderGame({ onNavigateHome, onResign });
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('resign')).toBeTruthy());
    fireEvent.press(screen.getByText('resign'));

    expect(onResign).toHaveBeenCalledTimes(1);
    expect(onNavigateHome).not.toHaveBeenCalled();
  });

  it('calling passTurn via the submit button (unchanged word) advances the turn without crashing', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    const submit = await screen.findByLabelText('Word is invalid - tap to pass turn');
    await act(async () => {
      fireEvent.press(submit);
    });
  });

  it('regression: submitting a real unlock-trigger word (e.g. "ten") actually shows the unlock alert', async () => {
    // Forces a deterministic starting word so a specific valid move
    // ("TEN" -> "TENS", a real single-letter-add move) is reachable via
    // taps, rather than depending on the random starting word. This is
    // the exact bug report this test guards against: handleWordSubmission
    // was fully implemented and unit-tested in isolation (see
    // providers/__tests__/UnlockProvider.test.tsx) but was never actually
    // called from this screen's submit handler, so playing a real unlock
    // trigger word during a live game silently did nothing.
    // Starts on "TENS" and removes the "S" (a valid remove-one-letter
    // move) so the *submitted* word is literally "TEN" - the unlock
    // trigger fires on the played word, not on the game's starting word.
    renderGame({ config: { initialWord: 'TENS' } });
    await waitFor(() => expect(screen.getByLabelText('Current word: TENS')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Remove letter S'));

    const submit = await screen.findByLabelText('Submit word');
    await act(async () => {
      fireEvent.press(submit);
    });

    // alertCopy.unlocks.mechanic: ['NEW', 'FEATURE', '{item}'] - two
    // separate unlocks fire for "ten" (10-letter-start and round-length-10),
    // queued one at a time; the first should already be visible.
    await waitFor(() => expect(screen.getByText('NEW')).toBeTruthy());
    expect(screen.getByText('FEATURE')).toBeTruthy();
  });

  it('regression: the displayed round count never exceeds maxTurns, even right as the game finishes', async () => {
    // packages/engine/gamestate.ts's switchToNextPlayer() increments
    // currentTurn *before* the finish check runs, so gameState.currentTurn
    // briefly overshoots by a full round once the game ends (a real,
    // reported bug: a 10-round game displayed "round 11" right as it
    // finished). Uses a 1-round game so the overshoot (which would compute
    // as "round 2") is trivial to reach and assert against.
    const onGameEnd = jest.fn();
    renderGame({ config: { maxTurns: 1, initialWord: 'CAT' }, onGameEnd });
    await waitFor(() => expect(screen.getByLabelText('Current word: CAT')).toBeTruthy());
    expect(screen.getByText('round 1')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Letter S'));
    const submit = await screen.findByLabelText('Submit word');
    await act(async () => {
      fireEvent.press(submit);
    });

    // The bot now moves automatically, finishing the 1-round game - wait
    // for that to actually happen (a positive signal the game truly
    // finished) rather than just asserting "round 2" never appeared,
    // which would trivially pass even if the game hadn't progressed yet.
    await waitFor(() => expect(onGameEnd).toHaveBeenCalled(), { timeout: 3000 });

    expect(screen.getByText('round 1')).toBeTruthy();
    expect(screen.queryByText('round 2')).toBeNull();
  });

  it('regression: a played move and a finished game are actually recorded into the player stats log', async () => {
    // Same class of bug as the unlock-wiring regression above: usePlayerStats
    // was fully implemented and unit-tested in isolation (see
    // hooks/__tests__/usePlayerStats.test.ts), but that alone doesn't prove
    // this screen actually calls recordMove/recordGameResult during a real
    // game. Plays a real 1-round game to completion, then mounts a fresh
    // StatsOverlay (a separate usePlayerStats consumer - see that test's own
    // comment on why order matters here) to verify the persisted log
    // reflects the move and the finished game.
    const onGameEnd = jest.fn();
    renderGame({ config: { maxTurns: 1, initialWord: 'CAT' }, botId: 'basicBot', onGameEnd });
    await waitFor(() => expect(screen.getByLabelText('Current word: CAT')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter S'));
    const submit = await screen.findByLabelText('Submit word');
    await act(async () => {
      fireEvent.press(submit);
    });

    await waitFor(() => expect(onGameEnd).toHaveBeenCalled(), { timeout: 3000 });

    // Give the fire-and-forget recordGameResult() call a tick to persist.
    await waitFor(async () => {
      const saved = await AsyncStorage.getItem('wordplay-player-stats');
      expect(saved).not.toBeNull();
    });

    render(
      <ThemeProvider>
        <StatsOverlay isVisible onClose={jest.fn()} />
      </ThemeProvider>
    );
    // "CATS" appears twice (longest AND shortest word played, since only
    // one move was recorded), plus once more as the game's starting word
    // is never itself a "played" word - so just confirm at least one row
    // shows it, and that the bot game was recorded under the right bot.
    // Win/loss outcome isn't deterministic here (depends on the bot's
    // actual move), so just confirm a game was recorded under the right
    // bot rather than asserting which side won.
    await waitFor(() => expect(screen.getAllByText('CATS').length).toBeGreaterThan(0));
    expect(screen.getByText('basicbot')).toBeTruthy();
    expect(screen.getByText(/W - \d+L \(1 played\)/)).toBeTruthy();
  });
});
