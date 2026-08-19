/**
 * Native sharing utilities - apps/web's `utils/shareUtils.ts` is entirely
 * browser-specific (Web Share API, Clipboard API, a `document.execCommand`
 * fallback), so this isn't a port so much as a from-scratch native
 * equivalent using React Native's built-in `Share` module, which already
 * gives access to the OS share sheet (Messages/Mail/copy/etc. on iOS,
 * the share intent chooser on Android) - no fallback chain needed the
 * way web's three-tier approach is.
 */
import { Share } from 'react-native';

export interface ShareResult {
  success: boolean;
  method: 'native' | 'dismissed';
  error?: string;
}

export async function shareChallengeResult(shareText: string): Promise<ShareResult> {
  try {
    const result = await Share.share({ message: shareText });
    if (result.action === Share.dismissedAction) {
      return { success: false, method: 'dismissed' };
    }
    return { success: true, method: 'native' };
  } catch (error) {
    return { success: false, method: 'dismissed', error: error instanceof Error ? error.message : 'Sharing failed' };
  }
}

/** Shares a multiplayer invite code - mirrors web's MultiplayerLobby.tsx
 * handleShareInvite (Web Share API there, RN's Share module here). */
export async function shareInviteCode(inviteCode: string): Promise<ShareResult> {
  try {
    const result = await Share.share({
      message: `Join my Wordplay game with code ${inviteCode}`,
      title: 'Join my Wordplay game'
    });
    if (result.action === Share.dismissedAction) {
      return { success: false, method: 'dismissed' };
    }
    return { success: true, method: 'native' };
  } catch (error) {
    return { success: false, method: 'dismissed', error: error instanceof Error ? error.message : 'Sharing failed' };
  }
}

export function getShareResultMessage(result: ShareResult): string {
  if (result.success) return 'Shared successfully!';
  return result.error || 'Sharing cancelled.';
}
