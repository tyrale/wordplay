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
});
