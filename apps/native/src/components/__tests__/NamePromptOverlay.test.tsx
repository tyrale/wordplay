import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { NamePromptOverlay } from '../NamePromptOverlay';

describe('native NamePromptOverlay', () => {
  it('renders nothing when not visible', () => {
    render(
      <ThemeProvider>
        <NamePromptOverlay isVisible={false} defaultName="Player1234" onSubmit={jest.fn()} />
      </ThemeProvider>
    );
    expect(screen.queryByText('Pick a name')).toBeNull();
  });

  it('shows the default title/subtitle and pre-fills the input with defaultName', async () => {
    render(
      <ThemeProvider>
        <NamePromptOverlay isVisible defaultName="Player1234" onSubmit={jest.fn()} />
      </ThemeProvider>
    );
    expect(await screen.findByText('Pick a name')).toBeTruthy();
    expect(screen.getByText('Opponents will see this')).toBeTruthy();
    expect(screen.getByDisplayValue('Player1234')).toBeTruthy();
  });

  it('supports custom title/subtitle/submitLabel copy (rename mid-game reuse)', async () => {
    render(
      <ThemeProvider>
        <NamePromptOverlay
          isVisible
          defaultName="Player1234"
          onSubmit={jest.fn()}
          title="Rename yourself"
          subtitle="Update your name"
          submitLabel="Save"
        />
      </ThemeProvider>
    );
    expect(await screen.findByText('Rename yourself')).toBeTruthy();
    expect(screen.getByText('Update your name')).toBeTruthy();
    expect(screen.getByLabelText('Save')).toBeTruthy();
  });

  it('submits the trimmed edited name', async () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider>
        <NamePromptOverlay isVisible defaultName="Player1234" onSubmit={onSubmit} />
      </ThemeProvider>
    );
    await screen.findByText('Pick a name');

    fireEvent.changeText(screen.getByDisplayValue('Player1234'), '  Alice  ');
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(onSubmit).toHaveBeenCalledWith('Alice');
  });

  it('falls back to defaultName when submitted blank', async () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider>
        <NamePromptOverlay isVisible defaultName="Player1234" onSubmit={onSubmit} />
      </ThemeProvider>
    );
    await screen.findByText('Pick a name');

    fireEvent.changeText(screen.getByDisplayValue('Player1234'), '   ');
    fireEvent.press(screen.getByLabelText('Continue'));

    expect(onSubmit).toHaveBeenCalledWith('Player1234');
  });

  it('does not render a Cancel link unless onCancel is provided', async () => {
    render(
      <ThemeProvider>
        <NamePromptOverlay isVisible defaultName="Player1234" onSubmit={jest.fn()} />
      </ThemeProvider>
    );
    await screen.findByText('Pick a name');
    expect(screen.queryByLabelText('Cancel')).toBeNull();
  });

  it('renders and fires a Cancel link when onCancel is provided', async () => {
    const onCancel = jest.fn();
    render(
      <ThemeProvider>
        <NamePromptOverlay isVisible defaultName="Player1234" onSubmit={jest.fn()} onCancel={onCancel} />
      </ThemeProvider>
    );
    await screen.findByText('Pick a name');

    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('resets the input to the (possibly new) defaultName whenever it becomes visible again', async () => {
    const { rerender } = render(
      <ThemeProvider>
        <NamePromptOverlay isVisible={false} defaultName="Player1234" onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider>
        <NamePromptOverlay isVisible defaultName="NewDefault" onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(await screen.findByDisplayValue('NewDefault')).toBeTruthy();
  });
});
