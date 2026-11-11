import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { WordPathGraphProvider, useWordPathGraph } from '../../providers/WordPathGraphProvider';
import type { UseWordPathGraphReturn } from '../../hooks/useWordPathGraph';
import { WordPathExplorer } from '../WordPathExplorer';

/** Exposes the same `WordPathGraphProvider` context the rendered
 * `WordPathExplorer` reads from, so tests can seed the graph through the
 * exact instance the component sees - matching how a real game screen and
 * Menu's WordPathExplorer now share one provider. */
function renderExplorer(props: Partial<React.ComponentProps<typeof WordPathExplorer>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  const controls: { current: UseWordPathGraphReturn | null } = { current: null };

  function Harness() {
    controls.current = useWordPathGraph();
    return <WordPathExplorer isVisible onClose={onClose} {...props} />;
  }

  const rendered = render(
    <ThemeProvider>
      <WordPathGraphProvider>
        <Harness />
      </WordPathGraphProvider>
    </ThemeProvider>
  );

  return { onClose, controls, ...rendered };
}

/** Seeds the AsyncStorage-backed graph via the rendered tree's own
 * provider instance (faster/more reliable than driving it through the
 * UI's own text input in every test). */
async function seedGraph(controls: { current: UseWordPathGraphReturn | null }, transitions: Array<[string, string]>) {
  await waitFor(() => expect(controls.current?.isLoading).toBe(false));
  await act(async () => {
    for (const [from, to] of transitions) {
      await controls.current!.recordTransition(from, to);
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
    const { controls } = renderExplorer();
    await seedGraph(controls, [['CAT', 'CATS']]);

    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'cat');

    await waitFor(() => expect(screen.getByText('CATS')).toBeTruthy());
    // CAT -> CATS is a pure letter addition.
    expect(screen.getByText('+')).toBeTruthy();
  });

  it('shows "no connections yet" for a seen word with no edges', async () => {
    const { controls } = renderExplorer();
    await seedGraph(controls, [['CAT', 'CAT']]); // Records CAT as seen with no edge (a pass).

    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'cat');
    await waitFor(() => expect(screen.getByText('no connections yet')).toBeTruthy());
  });

  it('tapping a connected word makes it the active word and shows a clear button', async () => {
    const { controls } = renderExplorer();
    await seedGraph(controls, [['CAT', 'CATS']]);

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

  it('sees a word recorded by another consumer sharing the same provider (e.g. an in-progress game)', async () => {
    // Regression test: WordPathExplorer used to read from its own,
    // independently-loaded engine instance, so a word recorded elsewhere
    // (like a game screen) during the same session wouldn't show up here
    // until the app restarted. With a shared WordPathGraphProvider, any
    // consumer's recordTransition is immediately visible to this one.
    const onClose = jest.fn();
    const controls: { current: UseWordPathGraphReturn | null } = { current: null };

    function OtherConsumer() {
      controls.current = useWordPathGraph();
      return null;
    }

    render(
      <ThemeProvider>
        <WordPathGraphProvider>
          <OtherConsumer />
          <WordPathExplorer isVisible onClose={onClose} />
        </WordPathGraphProvider>
      </ThemeProvider>
    );

    await seedGraph(controls, [['LOCK', 'UNLOCK']]);

    const input = await screen.findByLabelText('Type a word');
    fireEvent.changeText(input, 'unlock');

    await waitFor(() => expect(screen.getByText('LOCK')).toBeTruthy());
    expect(screen.queryByText("you haven't seen this yet")).toBeNull();
  });
});
