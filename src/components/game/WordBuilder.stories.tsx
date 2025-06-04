import type { Meta, StoryObj } from '@storybook/react';
import { WordBuilder } from './WordBuilder';
import type { LetterHighlight } from './CurrentWord';

const meta: Meta<typeof WordBuilder> = {
  title: 'Game/WordBuilder',
  component: WordBuilder,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Interactive word builder with drag-and-drop functionality for constructing and modifying words.',
      },
    },
  },
  argTypes: {
    currentWord: {
      control: 'text',
      description: 'The current word being built',
    },
    wordHighlights: {
      control: 'object',
      description: 'Highlighting information for letters (key/locked)',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the word builder is disabled',
    },
    maxLength: {
      control: { type: 'number', min: 3, max: 20 },
      description: 'Maximum word length',
    },
    minLength: {
      control: { type: 'number', min: 1, max: 10 },
      description: 'Minimum word length',
    },
  },
};

export default meta;
type Story = StoryObj<typeof WordBuilder>;

export const Basic: Story = {
  args: {
    currentWord: 'CATS',
    wordHighlights: [],
    disabled: false,
    maxLength: 10,
    minLength: 3,
  },
};

export const WithKeyLetter: Story = {
  args: {
    currentWord: 'HIPS',
    wordHighlights: [
      { index: 0, type: 'key' }, // H is key letter
    ] as LetterHighlight[],
    disabled: false,
    maxLength: 10,
    minLength: 3,
  },
};

export const WithLockedLetters: Story = {
  args: {
    currentWord: 'PUSH',
    wordHighlights: [
      { index: 0, type: 'key' }, // P is key letter
      { index: 2, type: 'locked' }, // S is locked
    ] as LetterHighlight[],
    disabled: false,
    maxLength: 10,
    minLength: 3,
  },
};

export const Mixed: Story = {
  args: {
    currentWord: 'BATS',
    wordHighlights: [
      { index: 0, type: 'key' }, // B is key letter
      { index: 3, type: 'locked' }, // S is locked
    ] as LetterHighlight[],
    disabled: false,
    maxLength: 8,
    minLength: 3,
  },
};

export const ShortWord: Story = {
  args: {
    currentWord: 'GO',
    wordHighlights: [],
    disabled: false,
    maxLength: 10,
    minLength: 3,
  },
};

export const MaxLength: Story = {
  args: {
    currentWord: 'ELEPHANT',
    wordHighlights: [
      { index: 0, type: 'key' },
      { index: 4, type: 'locked' },
    ] as LetterHighlight[],
    disabled: false,
    maxLength: 8,
    minLength: 3,
  },
};

export const Disabled: Story = {
  args: {
    currentWord: 'WORD',
    wordHighlights: [
      { index: 0, type: 'key' },
    ] as LetterHighlight[],
    disabled: true,
    maxLength: 10,
    minLength: 3,
  },
};

export const Empty: Story = {
  args: {
    currentWord: '',
    wordHighlights: [],
    disabled: false,
    maxLength: 10,
    minLength: 3,
  },
}; 