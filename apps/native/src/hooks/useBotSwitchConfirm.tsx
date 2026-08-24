/**
 * Shared "switch to a bot game" confirmation, used by every screen whose
 * in-game Menu exposes a "bots" section (GameScreenRoute, ZenGameRoute,
 * ChallengeGameRoute - see App.tsx) - tapping a bot there (from a bot
 * game, zen mode, or the daily challenge) abandons whatever's currently
 * in progress, so this always confirms first via a "START NEW GAME?"
 * AlertOverlay, matching web's App.tsx confirmation pattern (though web
 * only actually confirms from challenge/zen - this native port confirms
 * unconditionally, since every one of these screens has real progress
 * that a same-screen instant-switch would silently discard).
 *
 * "The basics" (the Menu's tutorial-replay entry) is the one exception -
 * it never confirms here either, matching web's `beginTutorialGame`
 * exactly.
 */
import React, { useCallback, useState } from 'react';
import { AlertOverlay } from '../components/AlertOverlay';
import { getBotDisplayName } from '@wordplay/engine/botRegistry';

export function useBotSwitchConfirm(
  /** Actually performs the navigation to a fresh bot game - the caller
   * owns the real `navigation.replace('Game', ...)` call so this hook
   * stays decoupled from the app's actual route/param types. */
  navigateToBotGame: (botId: string, options?: { forceTutorial?: boolean }) => void
) {
  const [pendingBotId, setPendingBotId] = useState<string | null>(null);

  const handleSwitchBot = useCallback((botId: string) => setPendingBotId(botId), []);
  const handleReplayTutorial = useCallback(
    (botId: string) => navigateToBotGame(botId, { forceTutorial: true }),
    [navigateToBotGame]
  );

  const confirmOverlay = (
    <AlertOverlay
      isVisible={!!pendingBotId}
      lines={['START', 'NEW', 'GAME?']}
      meta={pendingBotId ? `Exit the current game and play ${getBotDisplayName(pendingBotId)}?` : undefined}
      actions={[{
        label: 'yes',
        onPress: () => {
          const id = pendingBotId;
          setPendingBotId(null);
          if (id) navigateToBotGame(id);
        }
      }]}
      onClose={() => setPendingBotId(null)}
    />
  );

  return { handleSwitchBot, handleReplayTutorial, confirmOverlay };
}
