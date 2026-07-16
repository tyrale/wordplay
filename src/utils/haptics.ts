/**
 * Lightweight haptic feedback helper.
 *
 * Wraps the Vibration API (`navigator.vibrate`) with feature detection so
 * calls are safe no-ops on unsupported browsers/devices (e.g. desktop
 * Safari, iOS Safari which does not implement the Vibration API).
 */

export type HapticPattern = 'add' | 'remove' | 'move' | 'submit' | 'overlay' | 'unlock';

const OVERLAY_DURATION_MS = 12;

// Vibration durations (ms) tuned to feel distinct but subtle.
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  add: 10,
  remove: 15,
  move: 8,
  submit: 20,
  overlay: OVERLAY_DURATION_MS,
  // New-unlock celebrations get a longer buzz - double the standard overlay duration.
  unlock: OVERLAY_DURATION_MS * 2,
};

export function triggerHapticFeedback(pattern: HapticPattern = 'move'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    // Some browsers throw if called outside a user gesture; fail silently.
  }
}
