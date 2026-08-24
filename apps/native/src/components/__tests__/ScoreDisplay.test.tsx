import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { ScoreDisplay } from '../ScoreDisplay';
import { defaultTheme } from '@wordplay/theme/theme';
import type { MoveAttempt } from '@wordplay/engine/interfaces';

function invalidMoveAttempt(): MoveAttempt {
  return {
    newWord: 'ZZZZ',
    isValid: false,
    validationResult: { isValid: false, word: 'ZZZZ', reason: 'NOT_IN_DICTIONARY' },
    scoringResult: null,
    canApply: false
  };
}

function renderScoreDisplay(props: Partial<React.ComponentProps<typeof ScoreDisplay>>) {
  return render(
    <ThemeProvider>
      <ScoreDisplay moveAttempt={null} isValid={false} {...props} />
    </ThemeProvider>
  );
}

describe('native ScoreDisplay', () => {
  it('shows the ✗ mark in the theme text color when there is no pending move', async () => {
    renderScoreDisplay({ moveAttempt: null, isValid: false });
    const mark = await screen.findByText('✗');
    expect([mark.props.style].flat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: defaultTheme.colors.text })])
    );
  });

  it('flips the ✗ mark color to match the inverted (dark mode) text color', async () => {
    await AsyncStorage.setItem('wordplay-inverted', 'true');

    renderScoreDisplay({ moveAttempt: invalidMoveAttempt(), isValid: false });
    const mark = await screen.findByText('✗');
    expect([mark.props.style].flat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: defaultTheme.colors.background })])
    );
  });
});
