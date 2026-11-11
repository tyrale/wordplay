/**
 * Native UI sound-effects helper.
 *
 * Mirrors apps/web's `utils/sound.ts` public API exactly
 * (`triggerSoundFeedback(pattern)`/`setSoundEnabled`/`isSoundEnabled` with
 * the same `SoundPattern` union) so call sites don't need to change - only
 * the underlying implementation does. Web synthesizes each tone on the fly
 * with the Web Audio API's oscillators; `expo-audio` has no equivalent
 * "generate a tone from a frequency at call time" API (it only plays
 * pre-existing audio sources), so each pattern is instead pre-rendered
 * once to a short WAV file (see scripts/generate-native-sound-assets.cjs,
 * which renders the exact same frequencies/durations/gains/envelope as
 * web's `SOUND_PATTERNS`) and just played back here.
 *
 * One player per pattern is created lazily and reused (rather than a
 * fresh `createAudioPlayer` per call) so rapid-fire triggers (e.g. typing
 * several letters quickly) don't pile up native player instances -
 * `seekTo(0)` rewinds a still-playing/just-finished player before
 * replaying it, same idea as web's fire-and-forget oscillators.
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

// Sound effects should behave like a game's, not like background media:
// audible even with the iOS silent switch flipped, and layered on top of
// (never pausing) whatever else might be playing - matches web, where the
// browser's own audio has no concept of a "silent switch" to respect in
// the first place. Fire-and-forget at module load, same as web's lazy
// AudioContext creation - a rejection here (e.g. unsupported platform)
// shouldn't block anything else from loading.
void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});

export type SoundPattern = 'add' | 'remove' | 'move' | 'submit' | 'overlay' | 'unlock' | 'click' | 'yourTurn' | 'win' | 'lose' | 'pass';

// Metro resolves each require() to a numeric asset id at bundle time -
// these must stay static (no dynamic path construction) for that to work.
const SOUND_ASSETS: Record<SoundPattern, number> = {
  add: require('../../assets/sounds/add.wav'),
  remove: require('../../assets/sounds/remove.wav'),
  move: require('../../assets/sounds/move.wav'),
  submit: require('../../assets/sounds/submit.wav'),
  overlay: require('../../assets/sounds/overlay.wav'),
  unlock: require('../../assets/sounds/unlock.wav'),
  click: require('../../assets/sounds/click.wav'),
  yourTurn: require('../../assets/sounds/yourTurn.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  pass: require('../../assets/sounds/pass.wav')
};

let soundEnabled = true;
const players = new Map<SoundPattern, AudioPlayer>();

function getPlayer(pattern: SoundPattern): AudioPlayer {
  let player = players.get(pattern);
  if (!player) {
    player = createAudioPlayer(SOUND_ASSETS[pattern]);
    players.set(pattern, player);
  }
  return player;
}

/**
 * Enable or disable all UI sound effects. Defaults to enabled.
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function triggerSoundFeedback(pattern: SoundPattern = 'move'): void {
  if (!soundEnabled) {
    return;
  }

  try {
    const player = getPlayer(pattern);
    player.seekTo(0);
    player.play();
  } catch {
    // Fail silently - sound is a non-critical enhancement, matching web.
  }
}
