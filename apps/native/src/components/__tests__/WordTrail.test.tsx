import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { WordTrail } from '../WordTrail';
import type { WordMove } from '../WordTrail';

function renderTrail(props: Partial<React.ComponentProps<typeof WordTrail>> = {}) {
  return render(
    <ThemeProvider>
      <WordTrail {...props} />
    </ThemeProvider>
  );
}

describe('native WordTrail (regular mode)', () => {
  it('renders nothing when there is no history', () => {
    const { toJSON } = renderTrail({ moves: [] });
    expect(toJSON()).toBeNull();
  });

  it('renders words in chronological order, oldest at top and the most recent at the bottom (closest to the board)', async () => {
    const moves: WordMove[] = [
      { word: 'CAT', score: 1, turnNumber: 1 },
      { word: 'CATS', score: 2, turnNumber: 2 }
    ];
    renderTrail({ moves });

    // No onWordPress provided, so rows aren't buttons - query by their
    // accessibility label instead.
    const rows = await screen.findAllByLabelText(/^Word: /);
    expect(rows[0].props.accessibilityLabel).toContain('CAT');
    expect(rows[1].props.accessibilityLabel).toContain('CATS');
  });

  it('falls back to a plain `words` list (no scores/highlights) when `moves` is not provided', async () => {
    renderTrail({ words: ['DOG', 'DOGS'] });
    // Both words start with D, so there are two - letters render individually.
    expect(await screen.findAllByText('D')).toHaveLength(2);
    expect(screen.queryByText('pass')).toBeNull();
  });

  it('shows "pass" for a zero-score move when showScores is set', async () => {
    renderTrail({ moves: [{ word: 'CAT', score: 0, turnNumber: 1 }], showScores: true });
    expect(await screen.findByText('pass')).toBeTruthy();
  });

  it('shows a plain "+N" score when there is no breakdown', async () => {
    renderTrail({ moves: [{ word: 'CAT', score: 3, turnNumber: 1 }], showScores: true });
    expect(await screen.findByText('+3')).toBeTruthy();
  });

  it('splits base and key-letter bonus points from the score breakdown', async () => {
    renderTrail({
      moves: [
        {
          word: 'CATS',
          score: 5,
          turnNumber: 1,
          scoreBreakdown: { addLetterPoints: 1, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 4 }
        }
      ],
      showScores: true
    });
    expect(await screen.findByText('+1 +4')).toBeTruthy();
  });

  it('shows only the key-letter bonus when there is no base score', async () => {
    renderTrail({
      moves: [
        {
          word: 'CATS',
          score: 4,
          turnNumber: 1,
          scoreBreakdown: { addLetterPoints: 0, removeLetterPoints: 0, movePoints: 0, keyLetterUsagePoints: 4 }
        }
      ],
      showScores: true
    });
    expect(await screen.findByText('+4')).toBeTruthy();
  });

  it('renders masked words as dashes and does not highlight key letters within them', async () => {
    renderTrail({ moves: [{ word: 'CAT', score: 0, turnNumber: 1, keyLetters: ['C'], maskWord: true }] });
    const dashes = await screen.findAllByText('-');
    expect(dashes).toHaveLength(3);
    expect(screen.queryByText('C')).toBeNull();
  });

  it('fires onWordPress with the word and index when a row is tapped', async () => {
    const onWordPress = jest.fn();
    renderTrail({ moves: [{ word: 'CAT', score: 1, turnNumber: 1 }], onWordPress });

    fireEvent.press(await screen.findByRole('button'));
    expect(onWordPress).toHaveBeenCalledWith('CAT', 0);
  });
});

describe('native WordTrail (challenge mode)', () => {
  it('shows the empty state (start/target words with arrows, no played words) before any moves', async () => {
    renderTrail({ isChallengeMode: true, startWord: 'COLD', targetWord: 'WARM', moves: [] });

    expect(await screen.findByText('START')).toBeTruthy();
    expect(screen.getByText('TARGET')).toBeTruthy();
  });

  it('shows both start and target labels on the single played move when there is only one', async () => {
    renderTrail({
      isChallengeMode: true,
      startWord: 'COLD',
      targetWord: 'WARM',
      moves: [{ word: 'CORD', score: 0, turnNumber: 1 }]
    });

    expect(await screen.findByText('START')).toBeTruthy();
    expect(screen.getByText('TARGET')).toBeTruthy();
  });

  it('shows the start label on the earliest move and the target label on the most recent move', async () => {
    renderTrail({
      isChallengeMode: true,
      startWord: 'COLD',
      targetWord: 'WARM',
      moves: [
        { word: 'CORD', score: 0, turnNumber: 1 },
        { word: 'WORD', score: 0, turnNumber: 2 },
        { word: 'WARD', score: 0, turnNumber: 3 }
      ]
    });

    // Only one START and one TARGET label overall, not one per row.
    expect(await screen.findAllByText('START')).toHaveLength(1);
    expect(screen.getAllByText('TARGET')).toHaveLength(1);
  });

  it('does not show scores in challenge mode even if requested', async () => {
    renderTrail({
      isChallengeMode: true,
      startWord: 'COLD',
      targetWord: 'WARM',
      moves: [{ word: 'CORD', score: 5, turnNumber: 1 }],
      showScores: true
    });
    await screen.findByText('START');
    expect(screen.queryByText('+5')).toBeNull();
  });
});
