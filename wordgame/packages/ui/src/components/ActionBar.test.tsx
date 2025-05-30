import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActionBar, ActionType } from './ActionBar';

describe('ActionBar', () => {
  const allActions = [
    { type: 'move' as ActionType, onPress: jest.fn() },
    { type: 'add' as ActionType, onPress: jest.fn() },
    { type: 'remove' as ActionType, onPress: jest.fn() },
    { type: 'submit' as ActionType, onPress: jest.fn() },
    { type: 'invalid' as ActionType, onPress: jest.fn() },
  ];

  it('renders all actions', () => {
    const { toJSON } = render(<ActionBar actions={allActions} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders some disabled', () => {
    const actions = allActions.map((a, i) => ({ ...a, disabled: i % 2 === 0 }));
    const { toJSON } = render(<ActionBar actions={actions} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ActionBar actions={[{ type: 'add', onPress }]} />
    );
    fireEvent.press(getByText('+'));
    expect(onPress).toHaveBeenCalled();
  });
}); 