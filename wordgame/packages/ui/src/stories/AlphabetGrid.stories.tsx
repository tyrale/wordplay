import React, { useState } from 'react';
import { View, Text } from 'react-native';
// @ts-ignore
import { storiesOf } from '@storybook/react-native';
import { AlphabetGrid } from '../components/AlphabetGrid';
import { LetterCell } from '../components/LetterCell';

const letters = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

storiesOf('AlphabetGrid', module)
  .add('Default', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AlphabetGrid
        letters={letters}
        selectedIndices={[]}
      />
    </View>
  ))
  .add('With Selected Letters', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AlphabetGrid
        letters={letters}
        selectedIndices={[0, 1, 2]} // A, B, C selected
      />
    </View>
  ))
  .add('With Key Letter', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AlphabetGrid
        letters={letters}
        selectedIndices={[0, 1, 2]}
        keyIndex={3} // D is the key letter
      />
    </View>
  ))
  .add('With Locked Letter', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <AlphabetGrid
        letters={letters}
        selectedIndices={[0, 1, 2]}
        lockedIndex={4} // E is locked
      />
    </View>
  ))
  .add('Interactive (Tap/LongPress/Drag)', () => {
    const [selected, setSelected] = useState<number[]>([]);
    const [log, setLog] = useState<string[]>([]);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <AlphabetGrid
          letters={letters}
          selectedIndices={selected}
          onLetterTap={i => {
            setSelected(sel => sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]);
            setLog(l => [`Tapped ${letters[i]}`, ...l]);
          }}
          onLetterDragToWord={i => {
            setSelected(sel => sel.includes(i) ? sel : [...sel, i]);
            setLog(l => [`Dragged ${letters[i]} to word`, ...l]);
          }}
          onLetterDragFromWordToGrid={i => {
            setSelected(sel => sel.filter(x => x !== i));
            setLog(l => [`Dragged ${letters[i]} to grid`, ...l]);
          }}
        />
        <View style={{ marginTop: 24, width: 320 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Event Log:</Text>
          {log.slice(0, 5).map((entry, idx) => (
            <Text key={idx} style={{ fontSize: 12 }}>{entry}</Text>
          ))}
        </View>
      </View>
    );
  });

// LetterCell stories
storiesOf('LetterCell', module)
  .add('Normal', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <LetterCell letter="A" state="normal" />
    </View>
  ))
  .add('Selected', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <LetterCell letter="B" state="selected" />
    </View>
  ))
  .add('Key', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <LetterCell letter="C" state="key" />
    </View>
  ))
  .add('Locked', () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <LetterCell letter="D" state="locked" />
    </View>
  ))
  .add('Interactive', () => {
    const [state, setState] = useState<'normal' | 'selected' | 'key' | 'locked'>('normal');
    const [log, setLog] = useState<string[]>([]);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LetterCell
          letter="E"
          state={state}
          onTap={() => {
            setState(s => s === 'selected' ? 'normal' : 'selected');
            setLog(l => ['Tapped', ...l]);
          }}
          onLongPress={() => {
            setState('locked');
            setLog(l => ['Long pressed', ...l]);
          }}
          onDragStart={() => setLog(l => ['Drag started', ...l])}
          onDragEnd={() => setLog(l => ['Drag ended', ...l])}
        />
        <View style={{ marginTop: 24, width: 200 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Event Log:</Text>
          {log.slice(0, 5).map((entry, idx) => (
            <Text key={idx} style={{ fontSize: 12 }}>{entry}</Text>
          ))}
        </View>
      </View>
    );
  }); 