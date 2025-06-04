import type { Meta, StoryObj } from '@storybook/react';
import { GameBoard } from './GameBoard';

const meta: Meta<typeof GameBoard> = {
  title: 'Game/GameBoard',
  component: GameBoard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Turn4Example: Story = {
  args: {
    wordTrail: ['PLAY', 'LAPS', 'SLIP'],
    currentWord: 'HIPS',
    wordHighlights: [
      { index: 0, type: 'key' }, // H is key letter
    ],
    actions: {
      add: true,
      remove: false,
      move: true,
    },
    score: {
      base: 2,
      keyBonus: 1,
      total: 3,
    },
    isValidWord: true,
    letterStates: [
      { letter: 'H', state: 'key' },
      { letter: 'I', state: 'normal' },
      { letter: 'P', state: 'normal' },
      { letter: 'S', state: 'normal' },
    ],
  },
};

export const Turn5Example: Story = {
  args: {
    wordTrail: ['PLAY', 'LAPS', 'SLIP', 'HIPS'],
    currentWord: 'PUSH',
    wordHighlights: [
      { index: 1, type: 'locked' }, // U is locked
    ],
    actions: {
      add: false,
      remove: true,
      move: true,
    },
    score: {
      base: 1,
      keyBonus: 0,
      total: 1,
    },
    isValidWord: true,
    letterStates: [
      { letter: 'P', state: 'normal' },
      { letter: 'U', state: 'locked' },
      { letter: 'S', state: 'normal' },
      { letter: 'H', state: 'normal' },
    ],
  },
};

export const InvalidWord: Story = {
  args: {
    wordTrail: ['PLAY', 'LAPS'],
    currentWord: 'ZZZZZ',
    wordHighlights: [],
    actions: {
      add: true,
      remove: false,
      move: false,
    },
    score: {
      base: 0,
      keyBonus: 0,
      total: 0,
    },
    isValidWord: false,
    letterStates: [
      { letter: 'Z', state: 'normal' },
    ],
  },
};

export const EmptyState: Story = {
  args: {
    wordTrail: [],
    currentWord: 'WORD',
    wordHighlights: [],
    actions: {
      add: false,
      remove: false,
      move: false,
    },
    score: {
      base: 0,
      keyBonus: 0,
      total: 0,
    },
    isValidWord: true,
    letterStates: [],
  },
}; 