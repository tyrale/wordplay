import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

/**
 * Regression test for a real bug report: resigning/exiting a bot game
 * left the main screen showing its "bots" sub-view instead of the actual
 * main menu, because React Navigation keeps MainScreen mounted across a
 * Game screen push/pop rather than remounting it fresh (see App.tsx's
 * MainScreenRoute and MainScreen.tsx's own doc comment).
 */
describe('App navigation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns to the actual main menu (not the bot list) after exiting a bot game', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));

    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    // Now on the Game screen.
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());
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

    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));
    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    await waitFor(() => expect(screen.getByLabelText('Settings menu')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Settings menu'));
    await waitFor(() => expect(screen.getByText('resign')).toBeTruthy());
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

    await waitFor(() => expect(screen.getByText('nobody')).toBeTruthy());
    fireEvent.press(screen.getByText('nobody'));

    // Now on the Zen screen - reachable, playable, and back navigation works.
    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Return to home screen'));

    // Zen mode has no resign ceremony - returns straight to the main menu.
    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    expect(screen.getByText('nobody')).toBeTruthy();
  });

  it('auto-triggers the tutorial the first time a bot game is ever started, and not on a second game', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));
    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    await waitFor(() => expect(screen.getByText('Tap the S')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Skip tutorial'));

    // Leave and start a second bot game - the tutorial must not reappear.
    await waitFor(() => expect(screen.getByLabelText('Return to home screen')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Return to home screen'));

    await waitFor(() => expect(screen.getByText('bot')).toBeTruthy());
    fireEvent.press(screen.getByText('bot'));
    await waitFor(() => expect(screen.getByText('basicbot')).toBeTruthy());
    fireEvent.press(screen.getByText('basicbot'));

    await waitFor(() => expect(screen.getByLabelText('Reset word')).toBeTruthy());
    expect(screen.queryByText('Tap the S')).toBeNull();
  });

  it('"the basics" menu entry replays the tutorial even after it has already been seen', async () => {
    await AsyncStorage.setItem('wordplay-tutorial-seen', 'true');
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText('Open menu')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Open menu'));
    await waitFor(() => expect(screen.getByText('about')).toBeTruthy());
    fireEvent.press(screen.getByText('about'));
    await waitFor(() => expect(screen.getByText('the basics')).toBeTruthy());
    fireEvent.press(screen.getByText('the basics'));

    await waitFor(() => expect(screen.getByText('Tap the S')).toBeTruthy());
  });
});
