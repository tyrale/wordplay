/**
 * Unlock System Integration Tests
 * 
 * Tests the integration between the unlock system and React components.
 */

import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { UnlockProvider } from '../UnlockProvider';
import { AlertProvider } from '../../ui/AlertProvider';
import { useUnlockSystem } from '../UnlockProvider';
import type { UnlockContextType } from '../UnlockProvider';

// Test component that uses the unlock system
function TestUnlockComponent() {
  const { unlockState, isLoading, isUnlocked } = useUnlockSystem();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div data-testid="unlock-test">
      <div data-testid="unlocked-themes">{unlockState.themes.join(', ')}</div>
      <div data-testid="unlocked-bots">{unlockState.bots.join(', ')}</div>
      <div data-testid="unlocked-mechanics">{unlockState.mechanics.join(', ')}</div>
      <div data-testid="red-theme-unlocked">{isUnlocked('theme', 'red') ? 'yes' : 'no'}</div>
    </div>
  );
}

// Test wrapper with required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AlertProvider>
        <UnlockProvider>
          {children}
        </UnlockProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

describe('Unlock System Integration', () => {
  it('should initialize with default unlock state', async () => {
    render(
      <TestWrapper>
        <TestUnlockComponent />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Check initial state
    expect(screen.getByTestId('unlocked-themes')).toHaveTextContent('classic blue');
    expect(screen.getByTestId('unlocked-bots')).toHaveTextContent('basicBot');
    expect(screen.getByTestId('unlocked-mechanics')).toHaveTextContent('');
    expect(screen.getByTestId('red-theme-unlocked')).toHaveTextContent('no');
  });

  it('should provide unlock system context', async () => {
    render(
      <TestWrapper>
        <TestUnlockComponent />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Component should render without errors
    expect(screen.getByTestId('unlock-test')).toBeInTheDocument();
  });

  it('should handle unlock system errors gracefully', async () => {
    // This test verifies the component doesn't crash if unlock system has issues
    render(
      <TestWrapper>
        <TestUnlockComponent />
      </TestWrapper>
    );

    // Should eventually load even if there are initial errors
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByTestId('unlock-test')).toBeInTheDocument();
  });

  // Note: Reset functionality test removed due to IndexedDB not being available in test environment
  // The reset button can be tested manually in the browser at localhost:5173
});

// =============================================================================
// Non-local move unlock behavior
//
// Unlocks should fire for the local player when ANY participant in their game
// plays an unlockable word - not just the local player's own submissions. This
// covers bot moves and remote (vs-human) opponent moves, observed locally via
// game state. The only local-only behavior is the "RESET" developer cheat: a
// bot/opponent playing "RESET" must never wipe the local player's unlocks.
// See InteractiveGame.tsx onGameStateChange + UnlockProvider.handleWordSubmission.
// =============================================================================

// Hands the ready (and freshly-reset) unlock API to the test so it can drive
// submissions deterministically. resetUnlocksToFresh guarantees a clean slate
// even if a previous test left state in the shared fake-indexeddb database.
function UnlockApiProbe({ onReady }: { onReady: (api: UnlockContextType) => void }) {
  const api = useUnlockSystem();
  useEffect(() => {
    if (api.isLoading) return;
    let cancelled = false;
    api.resetUnlocksToFresh().then(() => {
      if (!cancelled) onReady(api);
    });
    return () => { cancelled = true; };
  }, [api.isLoading, onReady]);
  return null;
}

describe('Non-local move unlock behavior', () => {
  it('unlocks for the local player when a non-local (bot/opponent) word is played', async () => {
    let api: UnlockContextType | null = null;
    render(
      <TestWrapper>
        <UnlockApiProbe onReady={(a) => { api = a; }} />
      </TestWrapper>
    );

    await waitFor(() => expect(api).not.toBeNull(), { timeout: 3000 });

    // Sanity: midnight theme is not unlocked yet
    expect(api!.isUnlocked('theme', 'midnight')).toBe(false);

    // Simulate a bot or remote opponent playing "MIDNIGHT"
    await act(async () => {
      await api!.handleWordSubmission('midnight', false, { isLocalMove: false });
    });

    expect(api!.isUnlocked('theme', 'midnight')).toBe(true);
  });

  it('does NOT wipe unlocks when a non-local player plays "RESET"', async () => {
    let api: UnlockContextType | null = null;
    render(
      <TestWrapper>
        <UnlockApiProbe onReady={(a) => { api = a; }} />
      </TestWrapper>
    );

    await waitFor(() => expect(api).not.toBeNull(), { timeout: 3000 });

    // Local player unlocks the red theme first
    await act(async () => {
      await api!.handleWordSubmission('red', false);
    });
    expect(api!.isUnlocked('theme', 'red')).toBe(true);

    // A bot/opponent playing "RESET" must NOT wipe the local player's unlocks
    await act(async () => {
      await api!.handleWordSubmission('RESET', false, { isLocalMove: false });
    });

    expect(api!.isUnlocked('theme', 'red')).toBe(true);
  });

  it('still wipes unlocks when the LOCAL player plays "RESET" (default isLocalMove)', async () => {
    let api: UnlockContextType | null = null;
    render(
      <TestWrapper>
        <UnlockApiProbe onReady={(a) => { api = a; }} />
      </TestWrapper>
    );

    await waitFor(() => expect(api).not.toBeNull(), { timeout: 3000 });

    await act(async () => {
      await api!.handleWordSubmission('red', false);
    });
    expect(api!.isUnlocked('theme', 'red')).toBe(true);

    // Local player (default isLocalMove = true) playing RESET wipes unlocks
    await act(async () => {
      await api!.handleWordSubmission('RESET', false);
    });

    expect(api!.isUnlocked('theme', 'red')).toBe(false);
  });
}); 