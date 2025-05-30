import React, { useState } from 'react';
import { View, Text } from 'react-native';
// @ts-ignore
import { storiesOf } from '@storybook/react-native';
import { WordTrail } from '../components/WordTrail';
import { ActionBar, ActionType } from '../components/ActionBar';

const sampleWords = ['PLAY', 'LAPS', 'SLIP'];

storiesOf('WordTrail', module)
  .add('Empty', () => <WordTrail words={[]} />)
  .add('One Word', () => <WordTrail words={['PLAY']} />)
  .add('Many Words', () => <WordTrail words={sampleWords} />);

const allActions: { type: ActionType; label: string }[] = [
  { type: 'move', label: '<->' },
  { type: 'add', label: '+' },
  { type: 'remove', label: '-' },
  { type: 'submit', label: '✓' },
  { type: 'invalid', label: '×' },
];

storiesOf('ActionBar', module)
  .add('All Actions', () => (
    <ActionBar
      actions={allActions.map(a => ({
        type: a.type,
        onPress: () => {},
      }))}
    />
  ))
  .add('Some Disabled', () => (
    <ActionBar
      actions={allActions.map((a, i) => ({
        type: a.type,
        onPress: () => {},
        disabled: i % 2 === 0,
      }))}
    />
  ))
  .add('Interactive Log', () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <View>
        <ActionBar
          actions={allActions.map(a => ({
            type: a.type,
            onPress: () => setLog(l => [`Pressed ${a.label}`, ...l]),
          }))}
        />
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: 'bold' }}>Event Log:</Text>
          {log.slice(0, 5).map((entry, idx) => (
            <Text key={idx} style={{ fontSize: 12 }}>{entry}</Text>
          ))}
        </View>
      </View>
    );
  }); 