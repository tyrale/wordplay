import React from 'react';
import { render, renderHook, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AlertProvider } from '../../providers/AlertProvider';
import { UnlockProvider, useUnlockSystem } from '../../providers/UnlockProvider';
import { VanityFilterProvider } from '../../contexts/VanityFilterContext';
import { MechanicsSettingsProvider } from '../../contexts/MechanicsSettingsContext';
import { RoundLengthProvider } from '../../contexts/RoundLengthContext';
import { InteractiveGame } from '../InteractiveGame';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useWordPathGraph } from '../../hooks/useWordPathGraph';
import { StatsOverlay } from '../../components/StatsOverlay';

function Unlocker({ words }: { words: string[] }) {
  const { checkWordTriggers, isLoading } = useUnlockSystem();
  const ranRef = React.useRef(false);
  React.useEffect(() => {
    if (!isLoading && !ranRef.current) {
      ranRef.current = true;
      words.forEach(word => checkWordTriggers(word));
    }
  }, [isLoading, checkWordTriggers, words]);
  return null;
}

function renderGame(props: React.ComponentProps<typeof InteractiveGame> = {}, unlockWords: string[] = []) {
  return render(
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          <VanityFilterProvider>
            <MechanicsSettingsProvider>
              <RoundLengthProvider>
                <Unlocker words={unlockWords} />
                <InteractiveGame {...props} />
              </RoundLengthProvider>
            </MechanicsSettingsProvider>
          </VanityFilterProvider>
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

  it('shows a dictionary/help overlay (word + legality reason + definition) when "Help" is pressed', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ meanings: [{ definitions: [{ definition: 'a fake test definition' }] }] }]
    });

    try {
      renderGame();
      // Wait for the actual starting word to be populated (not just for
      // the always-rendered "Help" button to exist) - pendingWord starts
      // empty and is only synced from the async game manager's current
      // word once it initializes, and handleHelp is a no-op on an empty
      // word.
      await waitFor(() => expect(screen.getByLabelText(/^Current word: .+/)).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Help'));
      });

      await waitFor(() => expect(screen.getByText('a fake test definition')).toBeTruthy());
    } finally {
      global.fetch = originalFetch;
    }
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

  it('calls onSwitchBot (not onReplayTutorial) when a different bot is tapped in the Menu\'s "bots" section', async () => {
    const onSwitchBot = jest.fn();
    const onReplayTutorial = jest.fn();
    renderGame({ onSwitchBot, onReplayTutorial });
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('bots')).toBeTruthy());
    fireEvent.press(screen.getByText('bots'));
    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    expect(onSwitchBot).toHaveBeenCalledWith('basicBot');
    expect(onReplayTutorial).not.toHaveBeenCalled();
  });

  it('calls onReplayTutorial (not onSwitchBot) from the Menu\'s "the basics" entry', async () => {
    const onSwitchBot = jest.fn();
    const onReplayTutorial = jest.fn();
    renderGame({ onSwitchBot, onReplayTutorial });
    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('about')).toBeTruthy());
    fireEvent.press(screen.getByText('about'));
    await waitFor(() => expect(screen.getByText('the basics')).toBeTruthy());
    fireEvent.press(screen.getByText('the basics'));

    expect(onReplayTutorial).toHaveBeenCalledWith('basicBot');
    expect(onSwitchBot).not.toHaveBeenCalled();
  });

  it('requires a double tap on the submit button (unchanged word) to pass the turn - the first tap only shows the hint', async () => {
    // A forced deterministic starting word (matching the pattern of the
    // "ten" unlock-trigger regression test below) avoids the random
    // startingWordLength-selection path timing out the submit button's
    // enabled state before this test's own waitFor gets to check it.
    renderGame({ config: { initialWord: 'CAT' } });
    await waitFor(() => expect(screen.getByLabelText('Current word: CAT')).toBeTruthy());

    // First tap: reveals the "tap to pass" hint but does not pass yet -
    // no "pass" entry should appear in the word trail.
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Word is invalid - tap to pass turn'));
    });
    await waitFor(() => expect(screen.getByText('tap to pass')).toBeTruthy());
    expect(screen.queryByText('pass')).toBeNull();

    // Second tap (with the hint already showing): actually passes the turn.
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Word is invalid - tap to pass turn'));
    });
    await waitFor(() => expect(screen.getByText('pass')).toBeTruthy());
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

  it('records the local player\'s submitted move into the word path graph (AsyncStorage-backed, feeds the "paths" WordPathExplorer)', async () => {
    renderGame({ config: { initialWord: 'CAT' } });
    await waitFor(() => expect(screen.getByLabelText('Current word: CAT')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter S'));
    const submit = await screen.findByLabelText('Submit word');
    await act(async () => {
      fireEvent.press(submit);
    });

    // Mount a fresh consumer of the same AsyncStorage-backed graph (same
    // pattern as the player-stats regression test above - proves this
    // screen actually persisted the transition, not just that the hook
    // itself works in isolation).
    const { result } = renderHook(() => useWordPathGraph());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasSeenWord('CAT')).toBe(true);
    expect(result.current.getConnectedWords('CAT')).toContain('CATS');
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

  it('shows the tutorial banner when isTutorial is true, and skipping it calls onTutorialComplete', async () => {
    const onTutorialComplete = jest.fn();
    renderGame({
      config: { initialWord: 'WORD' },
      isTutorial: true,
      onTutorialComplete
    });

    await waitFor(() => expect(screen.getByText('Tap the S')).toBeTruthy());
    expect(screen.getByText('to spell words')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Skip tutorial'));
    expect(onTutorialComplete).toHaveBeenCalledTimes(1);
  });

  it('does not show the tutorial banner when isTutorial is false (the default)', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    expect(screen.queryByLabelText('Skip tutorial')).toBeNull();
  });

  it('shows a whole-game boss countdown when config.gameTimeLimitSeconds is set, and fires onGameTimeout at zero', async () => {
    const onGameTimeout = jest.fn();
    renderGame({ config: { gameTimeLimitSeconds: 1 }, onGameTimeout });
    await waitFor(() => expect(screen.getByText('1s')).toBeTruthy());

    await waitFor(() => expect(onGameTimeout).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(screen.getByText('0s')).toBeTruthy();
  });

  it('does not show a boss countdown for a normal game (no gameTimeLimitSeconds)', async () => {
    renderGame();
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    expect(screen.queryByText(/^\d+s$/)).toBeNull();
  });

  it('fires onBossTrigger when the player submits "GUS"', async () => {
    const onBossTrigger = jest.fn();
    renderGame({ config: { initialWord: 'GU' }, onBossTrigger });
    await waitFor(() => expect(screen.getByLabelText('Current word: GU')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Letter S'));
    const submit = await screen.findByLabelText('Submit word');
    await act(async () => {
      fireEvent.press(submit);
    });

    expect(onBossTrigger).toHaveBeenCalledWith('GUS');
  });

  it('shows a live per-turn countdown once the time-pressure mechanic is unlocked and toggled on', async () => {
    // "time-pressure" defaults *off* even once unlocked (see
    // MechanicsSettingsContext.tsx's DEFAULT_OFF_MECHANICS) - pre-seed
    // its toggle as explicitly on, matching what the Menu's toggle would
    // persist once the player switches it on themselves.
    await AsyncStorage.setItem('wordplay-mechanics-settings', JSON.stringify({ 'time-pressure': true }));
    renderGame({}, ['time']);

    // The right side of ScoreDisplay shows the countdown (starting at 7,
    // per TURN_TIME_LIMIT_SECONDS) instead of the usual pass/score
    // content, once the mechanic is actually unlocked+on and it's the
    // player's turn.
    expect(await screen.findByText('7')).toBeTruthy();
  });

  it('does not show a countdown when time-pressure is unlocked but left off (the default)', async () => {
    renderGame({}, ['time']);
    await waitFor(() => expect(screen.getByLabelText(/^Current word: .+/)).toBeTruthy());
    expect(screen.queryByText('7')).toBeNull();
  });

  // Drunk mode's wobble is wired app-wide via App.tsx's `DrunkModeOverlay`,
  // not per-screen - see DrunkModeOverlay.test.tsx for wobble coverage.
});
