import React from 'react';
import { ScrollView, Dimensions } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VanityFilterProvider } from '../../contexts/VanityFilterContext';
import { createNativeAdapter } from '../../adapters/nativeAdapter';
import { WordTrail } from '../WordTrail';
import type { WordMove } from '../WordTrail';

jest.mock('../../adapters/nativeAdapter', () => ({
  createNativeAdapter: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  (createNativeAdapter as jest.Mock).mockResolvedValue({
    getWordData: () => ({
      enableWords: new Set(['CAT', 'SHIT']),
      slangWords: new Set(),
      profanityWords: new Set(['SHIT']),
      properNounWords: new Set(),
      seussCanonicalWords: new Set(),
      seussInventedWords: new Set(),
      wordCount: 2,
      waitForLoad: jest.fn().mockResolvedValue(undefined)
    })
  });
});

const DEFAULT_MAX_HEIGHT_RATIO = 0.35;

function renderTrail(props: Partial<React.ComponentProps<typeof WordTrail>> = {}) {
  return render(
    <ThemeProvider>
      <VanityFilterProvider>
        <WordTrail {...props} />
      </VanityFilterProvider>
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

  it('renders the score value at the heaviest available font weight (900)', async () => {
    renderTrail({ moves: [{ word: 'CAT', score: 3, turnNumber: 1 }], showScores: true });
    const score = await screen.findByText('+3');
    const flattenedStyle = [score.props.style].flat();
    expect(flattenedStyle).toEqual(expect.arrayContaining([expect.objectContaining({ fontWeight: '900' })]));
  });

  it('positions the score with a numeric pixel `left` (the word\'s measured width), not a `\'100%\'` string', async () => {
    // Regression test: a plain `left: '100%'` never resolves on-device
    // (RN's Yoga layout engine only resolves percentage insets against an
    // ancestor with an explicit dimension, which the word's shrink-wrapped
    // container deliberately doesn't have) - the score rendered fine in
    // the web preview (react-native-web maps straight to real CSS) but
    // was completely invisible on a real iOS device. See WordTrail.tsx's
    // `WordRow` doc comment.
    renderTrail({ moves: [{ word: 'CAT', score: 3, turnNumber: 1 }], showScores: true });
    const score = await screen.findByText('+3');
    const flattenedStyle = [score.props.style].flat();
    const leftValues = flattenedStyle.filter(s => s && 'left' in s).map(s => s.left);
    expect(leftValues.length).toBeGreaterThan(0);
    leftValues.forEach(value => expect(typeof value).toBe('number'));
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

  it('censors a profane played word into symbols (vanity filter, on by default) instead of its real letters', async () => {
    renderTrail({ moves: [{ word: 'SHIT', score: 1, turnNumber: 1 }] });

    // Dictionary load is async - wait for the censored render to appear
    // (any of the real letters disappearing confirms it, since the
    // initial pre-load render shows the real word as-is).
    await waitFor(() => expect(screen.queryByText('S')).toBeNull());
    expect(screen.queryByText('H')).toBeNull();
    expect(screen.queryByText('I')).toBeNull();
    expect(screen.queryByText('T')).toBeNull();
  });

  it('fires onWordPress with the word and index when a row is tapped', async () => {
    const onWordPress = jest.fn();
    renderTrail({ moves: [{ word: 'CAT', score: 1, turnNumber: 1 }], onWordPress });

    fireEvent.press(await screen.findByRole('button'));
    expect(onWordPress).toHaveBeenCalledWith('CAT', 0);
  });

  it('scrolls (with a hidden scroll indicator) once there is history, capped at a default proportion of the window height', async () => {
    const { UNSAFE_getByType } = renderTrail({ moves: [{ word: 'CAT', score: 1, turnNumber: 1 }] });
    await screen.findByText('C');

    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);
    const expectedMaxHeight = Math.round(Dimensions.get('window').height * DEFAULT_MAX_HEIGHT_RATIO);
    const flattenedStyle = [scrollView.props.style].flat();
    expect(flattenedStyle).toEqual(expect.arrayContaining([expect.objectContaining({ maxHeight: expectedMaxHeight })]));
  });

  it('respects a custom maxHeight override', async () => {
    const { UNSAFE_getByType } = renderTrail({ moves: [{ word: 'CAT', score: 1, turnNumber: 1 }], maxHeight: 80 });
    await screen.findByText('C');

    const scrollView = UNSAFE_getByType(ScrollView);
    const flattenedStyle = [scrollView.props.style].flat();
    expect(flattenedStyle).toEqual(expect.arrayContaining([expect.objectContaining({ maxHeight: 80 })]));
  });

  it('bottom-aligns content against the floor (the current word below it) so a short trail is not stranded at the top', async () => {
    const { UNSAFE_getByType } = renderTrail({ moves: [{ word: 'CAT', score: 1, turnNumber: 1 }] });
    await screen.findByText('C');

    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.contentContainerStyle).toEqual(
      expect.objectContaining({ flexGrow: 1, justifyContent: 'flex-end' })
    );
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

  it('floats the start/target labels as absolutely-positioned overlays on either side, not inline siblings that would shift the played word off-center', async () => {
    renderTrail({
      isChallengeMode: true,
      startWord: 'COLD',
      targetWord: 'WARM',
      moves: [{ word: 'CORD', score: 0, turnNumber: 1 }]
    });

    // `right`/`left` are a measured *pixel* offset (the played word's own
    // rendered width), not a plain `'100%'` - RN's native layout engine
    // only resolves a percentage `left`/`right` on an absolutely-
    // positioned child when the positioned ancestor's own dimension is
    // explicitly set, which `rowContent` deliberately isn't (see
    // WordTrail.tsx's `WordRow` doc comment) - so this asserts against a
    // number instead.
    const startLabel = await screen.findByTestId('word-trail-start-label');
    expect(startLabel.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ position: 'absolute' }),
        expect.objectContaining({ right: expect.any(Number) })
      ])
    );

    const targetLabel = screen.getByTestId('word-trail-target-label');
    expect(targetLabel.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ position: 'absolute' }),
        expect.objectContaining({ left: expect.any(Number) })
      ])
    );
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
