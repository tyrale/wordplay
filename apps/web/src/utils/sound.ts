/**
 * Lightweight UI sound effects helper.
 *
 * Generates simple "tick"/"click" sounds on the fly using the Web Audio
 * API, so no audio asset files are required. Mirrors the pattern names
 * used by `triggerHapticFeedback` in `./haptics.ts` so the two can be
 * called together for consistent tactile + audible feedback.
 */

export type SoundPattern = 'add' | 'remove' | 'move' | 'submit' | 'overlay' | 'unlock' | 'click' | 'yourTurn' | 'win' | 'lose' | 'pass';

interface ToneStep {
  frequency: number;
  durationMs: number;
  delayMs?: number;
  gain?: number;
}

// Short, subtle tones tuned to feel like distinct "ticks" and "clicks"
// rather than full musical notes.
const SOUND_PATTERNS: Record<SoundPattern, ToneStep[]> = {
  add: [{ frequency: 720, durationMs: 30, gain: 0.05 }],
  remove: [{ frequency: 320, durationMs: 35, gain: 0.05 }],
  move: [{ frequency: 500, durationMs: 15, gain: 0.03 }],
  submit: [
    { frequency: 600, durationMs: 30, gain: 0.06 },
    { frequency: 900, durationMs: 40, delayMs: 40, gain: 0.06 },
  ],
  overlay: [{ frequency: 450, durationMs: 20, gain: 0.04 }],
  unlock: [
    { frequency: 700, durationMs: 30, gain: 0.07 },
    { frequency: 1000, durationMs: 30, delayMs: 40, gain: 0.07 },
    { frequency: 1300, durationMs: 50, delayMs: 80, gain: 0.07 },
  ],
  click: [{ frequency: 400, durationMs: 20, gain: 0.04 }],
  // A quick, bright two-note chime to call attention to a new turn.
  yourTurn: [
    { frequency: 880, durationMs: 30, gain: 0.06 },
    { frequency: 1175, durationMs: 40, delayMs: 60, gain: 0.06 },
  ],
  // Ascending, upbeat triad for a win.
  win: [
    { frequency: 660, durationMs: 40, gain: 0.07 },
    { frequency: 880, durationMs: 40, delayMs: 60, gain: 0.07 },
    { frequency: 1320, durationMs: 90, delayMs: 120, gain: 0.08 },
  ],
  // Descending, muted pair for a loss.
  lose: [
    { frequency: 420, durationMs: 60, gain: 0.07 },
    { frequency: 280, durationMs: 120, delayMs: 80, gain: 0.07 },
  ],
  // A single low, dull thud for passing a turn.
  pass: [{ frequency: 220, durationMs: 60, gain: 0.05 }],
};

let audioContext: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function playTone(ctx: AudioContext, step: ToneStep, startTime: number): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = step.frequency;

  const peakGain = step.gain ?? 0.05;
  const durationSec = step.durationMs / 1000;

  // Short attack, exponential-ish decay so it reads as a "tick"/"click"
  // rather than a sustained tone.
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.003);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + durationSec + 0.01);
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

  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  try {
    // Browsers suspend AudioContext until a user gesture resumes it; since
    // these calls always originate from user interactions, resume lazily.
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const steps = SOUND_PATTERNS[pattern];
    const now = ctx.currentTime;

    for (const step of steps) {
      playTone(ctx, step, now + (step.delayMs ?? 0) / 1000);
    }
  } catch {
    // Fail silently - sound is a non-critical enhancement.
  }
}
