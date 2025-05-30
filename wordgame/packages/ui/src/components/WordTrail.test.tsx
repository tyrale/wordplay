import React from 'react';
import { render } from '@testing-library/react-native';
import { WordTrail } from './WordTrail';

describe('WordTrail', () => {
  it('renders empty', () => {
    const { toJSON } = render(<WordTrail words={[]} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders one word', () => {
    const { getByText } = render(<WordTrail words={['PLAY']} />);
    expect(getByText('PLAY')).toBeTruthy();
  });

  it('renders many words', () => {
    const words = ['PLAY', 'LAPS', 'SLIP'];
    const { getByText } = render(<WordTrail words={words} />);
    words.forEach(word => {
      expect(getByText(word)).toBeTruthy();
    });
  });
}); 