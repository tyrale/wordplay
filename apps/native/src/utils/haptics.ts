/**
 * Native haptic feedback helper.
 *
 * Mirrors apps/web's `utils/haptics.ts` public API exactly
 * (`triggerHapticFeedback(pattern)` with the same `HapticPattern` union),
 * so call sites don't need to change - only the underlying implementation
 * does. The web version uses the Vibration API's raw millisecond
 * duration/pattern arrays, which iOS's Taptic Engine has no equivalent
 * for; `expo-haptics` instead exposes a small, fixed set of semantic
 * primitives (`impactAsync` styles, `notificationAsync` types,
 * `selectionAsync`). Each web pattern below is deliberately remapped to
 * the closest-feeling primitive rather than mechanically translated - see
 * the comments per pattern.
 */
import * as Haptics from 'expo-haptics';

export type HapticPattern = 'add' | 'remove' | 'move' | 'submit' | 'overlay' | 'unlock' | 'yourTurn' | 'win' | 'lose' | 'pass';

export async function triggerHapticFeedback(pattern: HapticPattern = 'move'): Promise<void> {
  try {
    switch (pattern) {
      // Subtle single taps for frequent, low-emphasis actions.
      case 'move':
      case 'overlay':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;

      // A letter tile leaving the board reads as slightly more "eventful"
      // than adding one, mirroring the web version's longer duration.
      case 'add':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case 'remove':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;

      // A deliberate, weightier confirmation for submitting a word.
      case 'submit':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;

      // A single, brief tap for passing a turn (mirrors the web version's
      // single short vibration).
      case 'pass':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;

      // Celebratory/attention-getting moments map to notification types,
      // which iOS renders as distinct multi-pulse patterns (closer to the
      // web version's multi-element vibration arrays than any single
      // impact style could be).
      case 'unlock':
      case 'win':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case 'lose':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;

      // "Your turn" is a selection-change-like nudge, not a pass/fail
      // outcome - `selectionAsync()` is the semantically closest primitive.
      case 'yourTurn':
        await Haptics.selectionAsync();
        return;

      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics can throw on unsupported devices/simulators - fail silently,
    // matching the web version's try/catch-and-ignore behavior.
  }
}
