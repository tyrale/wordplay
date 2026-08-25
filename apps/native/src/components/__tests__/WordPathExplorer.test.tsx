import React from 'react';
import { render, renderHook, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { useWordPathGraph } from '../../hooks/useWordPathGraph';
import { WordPathExplorer } from '../WordPathExplorer';

function renderExplorer(props: Partial<React.ComponentProps<typeof WordPathExplorer>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <WordPathExplorer isVisible onClose={onClose} {...props} />
      </ThemeProvider>
    )
  };
}

/** Seeds the AsyncStorage-backed graph directly (faster/more reliable
 * than driving it through the UI's own text input in every test). */
async function seedGraph(transitions: Array<[string, string]>) {
  const { result } = renderHook(() => useWordPathGraph());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => {
    for (const [from, to] of transitions) {
      await result.current.recordTransition(from, to);
    }
  });
}

describe('native WordPathExplorer', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders nothing when not visible', async () => {
    renderExplorer({ isVisible: false });
    await waitFor(() => {});
    expect(screen.queryByLabelText('Type a word')).toBeNull();
  });

  it('shows the initial hint before anything is typed', async () => {
    renderExplorer();
    await waitFor(() => expect(screen.getByText('type a word to see its path')).toBeTruthy());
  });

  it('shows "you haven\'t seen this yet" for a word never played', async () => {
    renderExplorer();
    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'zzzzz');
    await waitFor(() => expect(screen.getByText("you haven't seen this yet")).toBeTruthy());
  });

  it('lists connected words (with action icons) for a word that has been seen', async () => {
    await seedGraph([['CAT', 'CATS']]);
    renderExplorer();

    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'cat');

    await waitFor(() => expect(screen.getByText('CATS')).toBeTruthy());
    // CAT -> CATS is a pure letter addition.
    expect(screen.getByText('+')).toBeTruthy();
  });

  it('shows "no connections yet" for a seen word with no edges', async () => {
    await seedGraph([['CAT', 'CAT']]); // Records CAT as seen with no edge (a pass).
    renderExplorer();

    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'cat');
    await waitFor(() => expect(screen.getByText('no connections yet')).toBeTruthy());
  });

  it('tapping a connected word makes it the active word and shows a clear button', async () => {
    await seedGraph([['CAT', 'CATS']]);
    renderExplorer();

    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'cat');
    fireEvent.press(await screen.findByText('CATS'));

    await waitFor(() => expect(screen.getByText('CATS')).toBeTruthy());
    expect(screen.queryByLabelText('Type a word')).toBeNull();
    const clearButton = await screen.findByLabelText('Clear active word');
    expect(clearButton).toBeTruthy();

    fireEvent.press(clearButton);
    await waitFor(() => expect(screen.getByLabelText('Type a word')).toBeTruthy());
  });

  it('calls onClose (and resets to typing mode) when the close button is pressed', async () => {
    const { onClose } = renderExplorer();
    fireEvent.press(await screen.findByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
