import type { Meta, StoryObj } from '@storybook/react';
import { GridCell } from './GridCell';

const meta: Meta<typeof GridCell> = {
  title: 'UI/GridCell',
  component: GridCell,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['normal', 'key', 'locked', 'disabled'],
    },
    type: {
      control: 'select',
      options: ['letter', 'action'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    content: 'A',
    state: 'normal',
    type: 'letter',
  },
};

export const KeyLetter: Story = {
  args: {
    content: 'H',
    state: 'key',
    type: 'letter',
  },
};

export const LockedLetter: Story = {
  args: {
    content: 'S',
    state: 'locked',
    type: 'letter',
  },
};

export const DisabledLetter: Story = {
  args: {
    content: 'X',
    state: 'disabled',
    type: 'letter',
  },
};

export const ActionButton: Story = {
  args: {
    content: '←',
    state: 'normal',
    type: 'action',
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <GridCell content="A" state="normal" type="letter" />
      <GridCell content="H" state="key" type="letter" />
      <GridCell content="S" state="locked" type="letter" />
      <GridCell content="X" state="disabled" type="letter" />
      <GridCell content="←" state="normal" type="action" />
      <GridCell content="?" state="normal" type="action" />
    </div>
  ),
}; 