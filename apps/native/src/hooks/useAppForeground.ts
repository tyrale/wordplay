/**
 * Fires `onForeground` whenever the app transitions from the background
 * (or an inactive/inbetween state, e.g. the iOS app-switcher) back to
 * the foreground - RN's `AppState` doesn't expose a dedicated "just
 * resumed" event, only the raw state string, so this tracks the previous
 * value itself and only fires on an actual background/inactive -> active
 * transition (not on the initial mount, and not on every 'active'
 * event - RN can report 'active' more than once in a row for reasons
 * unrelated to backgrounding, e.g. certain permission-prompt dismissals
 * on iOS).
 *
 * No web equivalent is needed here (see
 * docs/project/REACT_NATIVE_PORT_PLAN.md's Phase 4 notes) - a browser
 * tab's realtime WebSocket generally survives being backgrounded/
 * unfocused in a way a native app's does not, so this hook (and its one
 * caller, useMultiplayerManager.ts's reconnect-on-foreground wiring) is
 * native-only.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

export function useAppForeground(onForeground: () => void): void {
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const cameToForeground = appStateRef.current.match(/inactive|background/) && nextState === 'active';
      appStateRef.current = nextState;
      if (cameToForeground) {
        callbackRef.current();
      }
    });

    return () => subscription.remove();
  }, []);
}
