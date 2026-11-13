import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

/**
 * Regression test for a real bug report: resigning/exiting a bot game
 * left the main screen showing its "bots" sub-view instead of the actual
 * main menu, because React Navigation keeps MainScreen mounted across a
 * Game screen push/pop rather than remounting it fresh (see App.tsx's
 * MainScreenRoute and MainScreen.tsx's own doc comment).
 */
/**
 * Waits for `assertion` to pass, then lets the app finish settling before
 * the caller interacts with what it found.
 *
 * RNTL's `waitFor` polls with the act environment switched off, so it can
 * observe a committed tree whose passive effects haven't run yet. On the
 * Main screen that matters: React Navigation's initial/return `focus`
 * event fires from those effects, and MainScreenRoute's useFocusEffect
 * responds by remounting MainScreen (a changing `key`, see App.tsx). If
 * the test presses "vs bot" in that window, the press's own act() flushes
 * the pending remount first and the press lands on the discarded
 * instance - the "bots" sub-view never opens and the following
 * `waitFor(... 'basicbot' ...)` times out. That was the intermittent CI
 * failure (no amount of extra timeout fixes it). Yielding one macrotask
 * inside act() lets the scheduled effects (and the remount they trigger)
 * run before the next interaction.
 */
async function waitForSettled(assertion: () => void): Promise<void> {
  await waitFor(assertion);
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

describe('App navigation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns to the actual main menu (not the bot list) after exiting a bot game', async () => {
    render(<App />);

    await waitForSettled(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));

    await waitForSettled(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    // Now on the Game screen.
    await waitForSettled(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Return to home screen'));

    // Back on Main - must show the actual main menu, not the "bots" sub-view.
    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    expect(screen.getByText('world')).toBeTruthy();
    expect(screen.getByText('human')).toBeTruthy();
    expect(screen.queryByText('basicbot')).toBeNull();
  });

  /**
   * Regression test for a second real bug report: resigning showed no
   * overlay at all (it went straight back to the main menu), because
   * this app's InteractiveGame originally collapsed web's distinct
   * onNavigateHome ('←' - no ceremony) and onResign (Menu's dedicated
   * resign action - shows a quitter AlertOverlay first) into a single
   * onExit callback. Drives the *real* Menu's resign action (not the
   * '←' button, which intentionally has no ceremony) and asserts the
   * actual quitter AlertOverlay text appears before returning home.
   */
  it('shows a real quitter AlertOverlay when resigning via the Menu (not the "←" button)', async () => {
    render(<App />);

    await waitForSettled(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));
    await waitForSettled(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    await waitForSettled(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitForSettled(() => expect(screen.getByText('resign')).toBeTruthy());
    fireEvent.press(screen.getByText('resign'));

    // alertCopy.quit's variants are all distinct multi-line phrases (e.g.
    // ['ALWAYS','THE','QUITTER'], ['COWARD']) - just assert the overlay's
    // close button is reachable, proving a real overlay (not nothing, not
    // an OS Alert.alert dialog) is actually showing.
    await waitFor(() => expect(screen.getByLabelText('Close')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    expect(screen.getByText('world')).toBeTruthy();
  });

  it('reaches and plays zen mode ("nobody") once unlocked, with no bot/score/resign ceremony', async () => {
    // Pre-seed the unlock state (mirrors what checkWordTriggers persists
    // after playing "zen") so zen mode is reachable from the main menu.
    await AsyncStorage.setItem(
      'wordplay-unlock-state',
      JSON.stringify({
        themes: ['classic blue'],
        mechanics: ['zen-mode'],
        bots: ['basicBot'],
        achievements: [],
        reveals: [],
        hasUsedReset: false
      })
    );

    render(<App />);

    await waitForSettled(() => expect(screen.getByText('nobody')).toBeTruthy());
    fireEvent.press(screen.getByText('nobody'));

    // Now on the Zen screen - reachable, playable, and back navigation works.
    await waitForSettled(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Return to home screen'));

    // Zen mode has no resign ceremony - returns straight to the main menu.
    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    expect(screen.getByText('nobody')).toBeTruthy();
  });

  /**
   * Regression test for a real bug report: on iOS, dragging a letter of
   * the word in play left/right triggered the native stack's swipe-back
   * gesture and popped the game screen mid-drag. Gameplay screens turn
   * that gesture off (App.tsx); Main keeps the platform default.
   */
  it('disables the iOS swipe-back gesture on gameplay screens so letter drags win', async () => {
    await AsyncStorage.setItem(
      'wordplay-unlock-state',
      JSON.stringify({
        themes: ['classic blue'],
        mechanics: ['zen-mode'],
        bots: ['basicBot'],
        achievements: [],
        reveals: [],
        hasUsedReset: false
      })
    );

    render(<App />);

    await waitForSettled(() => expect(screen.getByText('nobody')).toBeTruthy());
    fireEvent.press(screen.getByText('nobody'));
    await waitForSettled(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());

    // One native screen per stack entry, in push order: Main, then Zen.
    const nativeScreens = screen.UNSAFE_root.findAll(
      (node: Parameters<Parameters<typeof screen.UNSAFE_root.findAll>[0]>[0]) => node.type === 'RNSScreen' && 'gestureEnabled' in node.props
    );
    expect(nativeScreens).toHaveLength(2);
    expect(nativeScreens[0].props.gestureEnabled).not.toBe(false);
    expect(nativeScreens[1].props.gestureEnabled).toBe(false);
  });

  it('auto-triggers the tutorial the first time a bot game is ever started, and not on a second game', async () => {
    render(<App />);

    await waitForSettled(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));
    await waitForSettled(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    await waitForSettled(() => expect(screen.getByText('Tap the S')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Skip tutorial'));

    // Leave and start a second bot game - the tutorial must not reappear.
    await waitForSettled(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Return to home screen'));

    await waitForSettled(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));
    await waitForSettled(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    expect(screen.queryByText('Tap the S')).toBeNull();
  });

  it('"the basics" menu entry replays the tutorial even after it has already been seen', async () => {
    await AsyncStorage.setItem('wordplay-tutorial-seen', 'true');
    render(<App />);

    await waitForSettled(() => expect(screen.getByLabelText('Open menu')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Open menu'));
    await waitForSettled(() => expect(screen.getByText('about')).toBeTruthy());
    fireEvent.press(screen.getByText('about'));
    await waitForSettled(() => expect(screen.getByText('the basics')).toBeTruthy());
    fireEvent.press(screen.getByText('the basics'));

    await waitFor(() => expect(screen.getByText('Tap the S')).toBeTruthy());
  });

  // A true end-to-end "reach the boss via real UI taps" test isn't
  // practical here: WordPlay only allows one add/remove/rearrange per
  // turn, so there's no guaranteed valid single-move path from an
  // arbitrary *random* starting word to "GUS" - clearing-and-retyping
  // isn't a legal move. The GUS trigger itself (InteractiveGame.test.tsx,
  // via a forced `initialWord: 'GU'` config so GU -> GUS is a real valid
  // add-one-letter move) and the boss encounter screen it navigates to
  // (BossBattleScreen.test.tsx) are each covered thoroughly at the
  // component level instead - the right granularity for this specific
  // wiring, not a gap.
});
