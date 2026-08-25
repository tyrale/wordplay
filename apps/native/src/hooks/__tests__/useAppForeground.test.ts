import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppForeground } from '../useAppForeground';

/** Grabs the 'change' listener the hook itself registered via
 * `AppState.addEventListener`, so tests can simulate a transition by
 * calling it directly - mirrors how RN itself would invoke it. */
function getRegisteredListener(): (state: string) => void {
  const call = (AppState.addEventListener as jest.Mock).mock.calls.find(([event]) => event === 'change');
  return call?.[1];
}

describe('native useAppForeground', () => {
  beforeEach(() => {
    (AppState.addEventListener as jest.Mock).mockClear();
    (AppState as unknown as { currentState: string }).currentState = 'active';
  });

  it('does not fire on mount', () => {
    const onForeground = jest.fn();
    renderHook(() => useAppForeground(onForeground));
    expect(onForeground).not.toHaveBeenCalled();
  });

  it('fires when the app transitions from background to active', () => {
    (AppState as unknown as { currentState: string }).currentState = 'background';
    const onForeground = jest.fn();
    renderHook(() => useAppForeground(onForeground));

    const listener = getRegisteredListener();
    listener('active');

    expect(onForeground).toHaveBeenCalledTimes(1);
  });

  it('fires when the app transitions from inactive to active', () => {
    (AppState as unknown as { currentState: string }).currentState = 'inactive';
    const onForeground = jest.fn();
    renderHook(() => useAppForeground(onForeground));

    getRegisteredListener()('active');

    expect(onForeground).toHaveBeenCalledTimes(1);
  });

  it('does not fire on a background -> inactive transition (not yet foregrounded)', () => {
    (AppState as unknown as { currentState: string }).currentState = 'background';
    const onForeground = jest.fn();
    renderHook(() => useAppForeground(onForeground));

    getRegisteredListener()('inactive');

    expect(onForeground).not.toHaveBeenCalled();
  });

  it('does not fire on a redundant active -> active report', () => {
    (AppState as unknown as { currentState: string }).currentState = 'active';
    const onForeground = jest.fn();
    renderHook(() => useAppForeground(onForeground));

    getRegisteredListener()('active');

    expect(onForeground).not.toHaveBeenCalled();
  });

  it('always calls the latest callback, even if it changes across re-renders without re-registering the listener', () => {
    (AppState as unknown as { currentState: string }).currentState = 'background';
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { rerender } = renderHook(({ cb }: { cb: () => void }) => useAppForeground(cb), {
      initialProps: { cb: firstCallback }
    });

    const registrationCountBefore = (AppState.addEventListener as jest.Mock).mock.calls.length;
    rerender({ cb: secondCallback });
    // Re-rendering with a new callback identity must not re-subscribe -
    // the ref-based pattern this hook uses exists precisely so a fresh
    // callback on every render doesn't churn the underlying subscription.
    expect((AppState.addEventListener as jest.Mock).mock.calls.length).toBe(registrationCountBefore);

    getRegisteredListener()('active');
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('removes its subscription on unmount', () => {
    const remove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValueOnce({ remove });

    const { unmount } = renderHook(() => useAppForeground(jest.fn()));
    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
