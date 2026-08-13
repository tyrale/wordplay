/**
 * Boss Battle Music - Procedural Web Audio
 *
 * Generates an ORIGINAL, "final-countdown"-inspired synth motif on the fly via
 * the Web Audio API, so no audio asset files are required and there are no
 * copyright concerns. The motif is a short, looping arpeggio-driven phrase
 * that escalates in intensity per boss stage (boss -> megaboss -> gigaboss)
 * by layering an extra octave voice and shortening the loop.
 *
 * This is intentionally simple and lightweight: one shared AudioContext, a few
 * oscillators + gain envelopes scheduled on a lookahead loop. It mirrors the
 * "fail silently" philosophy of src/utils/sound.ts - audio is a non-critical
 * enhancement.
 */

import { useEffect, useRef } from 'react';
import type { BossStage } from '../data/bossBattle';

export interface UseBossMusicOptions {
  /** Start/stop the music. Only true during an active gigaboss battle. */
  enabled: boolean;
  /** Current boss stage (used to escalate intensity). null when disabled. */
  stage: BossStage | null;
}

// Shared, lazily-created AudioContext (matches the singleton pattern in sound.ts).
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext) sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

// Original motif: a descending minor arpeggio with a rising resolution, evoking
// "the final countdown" energy without copying it. Notes are MIDI numbers.
// Stage 1 (boss): single voice. Stage 2 (mega): adds an octave-up voice.
// Stage 3 (giga): octave voice + faster loop + brighter waveform.
const MOTIF_NOTES: number[] = [
  // Bar 1: descending A minor arpeggio
  69, 64, 60, 57,
  // Bar 2: rising resolution back to the tonic
  60, 64, 67, 69
];

// Seconds per note at each stage (loop gets tighter as the bosses escalate).
const NOTE_DURATIONS: Record<BossStage, number> = {
  boss: 0.28,
  mega: 0.24,
  giga: 0.2
};

const OCTAVE_VOICES: Record<BossStage, boolean> = {
  boss: false,
  mega: true,
  giga: true
};

const WAVEFORMS: Record<BossStage, OscillatorType> = {
  boss: 'sawtooth',
  mega: 'sawtooth',
  giga: 'square'
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Plays the looping boss motif until the returned stop function is called.
 * Schedules notes on a lookahead timer so the loop continues seamlessly.
 */
function startBossMusic(ctx: AudioContext, stage: BossStage): () => void {
  const noteDur = NOTE_DURATIONS[stage];
  const loopLengthSec = MOTIF_NOTES.length * noteDur;
  const addOctave = OCTAVE_VOICES[stage];
  const wave = WAVEFORMS[stage];

  // Master gain for the whole motif. Kept modest so it sits under the UI SFX
  // but loud enough to clearly read as background music.
  const master = ctx.createGain();
  master.gain.value = 0.11;
  master.connect(ctx.destination);

  // A gentle low-pass to keep the synth from getting harsh.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = stage === 'giga' ? 2200 : 1600;
  filter.connect(master);

  let stopped = false;
  let nextStartTime = ctx.currentTime + 0.05;
  let schedulerTimer: number | null = null;

  const scheduleLoop = (loopStart: number) => {
    MOTIF_NOTES.forEach((midi, i) => {
      const t = loopStart + i * noteDur;
      // Main voice
      playNote(ctx, filter, midiToFreq(midi), t, noteDur, wave, 1);
      // Optional octave-up voice (mega/giga) for escalation
      if (addOctave) {
        playNote(ctx, filter, midiToFreq(midi + 12), t, noteDur, wave, 0.4);
      }
    });
  };

  // Lookahead scheduler: keep ~1 loop ahead scheduled.
  const tick = () => {
    if (stopped) return;
    while (nextStartTime < ctx.currentTime + 0.4) {
      scheduleLoop(nextStartTime);
      nextStartTime += loopLengthSec;
    }
    schedulerTimer = window.setTimeout(tick, 100);
  };
  tick();

  return () => {
    stopped = true;
    if (schedulerTimer !== null) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    // Quick fade out to avoid a click, then disconnect.
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.08);
    window.setTimeout(() => {
      try { master.disconnect(); } catch { /* already gone */ }
    }, 120);
  };
}

function playNote(
  ctx: AudioContext,
  destination: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  gainScale: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  const peak = 0.5 * gainScale;
  // Plucked-synth style envelope: quick attack, decay, release at note end.
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.9);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/**
 * React hook that starts/stops the boss battle music. The music only plays
 * while `enabled` is true; toggling it off cleanly stops the motif.
 */
export function useBossMusic({ enabled, stage }: UseBossMusicOptions): void {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const ctx = getAudioContext();
    if (!ctx || !enabled || !stage) {
      // Tear down any running motif when disabled.
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
      return;
    }

    // Browsers suspend AudioContext until a user gesture resumes it. Boss
    // battles always start from a user gesture (closing the intro/advance
    // alert), so resume lazily here. Always call resume() (not just when
    // suspended) - it's a no-op if already running and avoids edge cases where
    // the context is in the "interrupted" state on some browsers.
    void ctx.resume().catch(() => { /* resume can reject if no gesture yet */ });

    // (Re)start the motif for the current stage.
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    stopRef.current = startBossMusic(ctx, stage);

    return () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, [enabled, stage]);
}
