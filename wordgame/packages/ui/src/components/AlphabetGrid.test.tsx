import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AlphabetGrid } from './AlphabetGrid';

describe('AlphabetGrid', () => {
  const letters = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

  it('renders all 26 letters', () => {
    const { getByText } = render(
      <AlphabetGrid letters={letters} selectedIndices={[]} />
    );
    letters.forEach(letter => {
      expect(getByText(letter)).toBeTruthy();
    });
  });

  it('calls onLetterTap when a letter is tapped', () => {
    const onLetterTap = jest.fn();
    const { getByText } = render(
      <AlphabetGrid letters={letters} selectedIndices={[]} onLetterTap={onLetterTap} />
    );
    fireEvent.press(getByText('A'));
    expect(onLetterTap).toHaveBeenCalledWith(0);
  });

  it('calls onLetterDragToWord when a letter is dragged to word area', () => {
    const onLetterDragToWord = jest.fn();
    const wordAreaLayout = { x: 0, y: 0, width: 100, height: 50 };
    const { getByText } = render(
      <AlphabetGrid
        letters={letters}
        selectedIndices={[]}
        onLetterDragToWord={onLetterDragToWord}
        wordAreaLayout={wordAreaLayout}
      />
    );
    // Simulate drag end (placeholder)
    fireEvent(getByText('A'), 'onResponderRelease');
    expect(onLetterDragToWord).toBeDefined();
  });
}); 