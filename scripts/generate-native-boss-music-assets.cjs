#!/usr/bin/env node
/**
 * Generates the looping boss-battle music WAV files bundled by apps/native's
 * boss music hook (src/hooks/useBossMusic.ts).
 *
 * apps/web's `hooks/useBossMusic.ts` synthesizes this motif on the fly with
 * the Web Audio API (oscillators + a lowpass filter, scheduled on a
 * lookahead loop) - no audio asset files needed there. React Native has no
 * equivalent "generate a tone from an oscillator at call time" API
 * (expo-audio only plays pre-existing audio sources), so this script
 * renders one exact loop iteration of the same motif (same notes/
 * durations/waveforms/octave-doubling/lowpass cutoff/envelope) to a WAV
 * file per boss stage, which the app then plays back with `loop = true`.
 *
 * apps/web/src/hooks/useBossMusic.ts remains the single source of truth for
 * this motif; re-run this whenever it changes:
 *
 *   node scripts/generate-native-boss-music-assets.cjs
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'apps/native/assets/sounds');

const SAMPLE_RATE = 44100;

// Mirrors apps/web/src/hooks/useBossMusic.ts exactly.
const MOTIF_NOTES = [
  // Bar 1: descending A minor arpeggio
  69, 64, 60, 57,
  // Bar 2: rising resolution back to the tonic
  60, 64, 67, 69
];

const NOTE_DURATIONS = { boss: 0.28, mega: 0.24, giga: 0.2 };
const OCTAVE_VOICES = { boss: false, mega: true, giga: true };
const WAVEFORMS = { boss: 'sawtooth', mega: 'sawtooth', giga: 'square' };
const FILTER_CUTOFF = { boss: 1600, mega: 1600, giga: 2200 };
const MASTER_GAIN = 0.11;

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Naive bandlimited-free oscillators - matches OscillatorType shapes closely
 * enough for a short retro synth motif (some aliasing is fine/expected). */
function oscillatorSample(type, phase) {
  // phase is in [0, 1)
  if (type === 'sawtooth') {
    return 2 * (phase - Math.floor(phase + 0.5));
  }
  // square
  return phase < 0.5 ? 1 : -1;
}

/** Same envelope as web's playNote(): quick linear attack to peak, then an
 * exponential decay to (near) silence by 90% of the note's duration. */
function envelopeGain(tSeconds, durationSeconds, peakGain) {
  const attackSeconds = 0.01;
  if (tSeconds < attackSeconds) {
    return (peakGain * tSeconds) / attackSeconds;
  }
  const decayStart = attackSeconds;
  const decayEnd = durationSeconds * 0.9;
  const decayDuration = Math.max(decayEnd - decayStart, 0.0001);
  const decayT = Math.min((tSeconds - decayStart) / decayDuration, 1);
  const floor = 0.0001;
  return peakGain * Math.pow(floor / peakGain, decayT);
}

/** Simple one-pole lowpass IIR filter, applied in-place. Approximates the
 * BiquadFilterNode('lowpass') used on web closely enough for this motif. */
function applyLowpass(samples, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    prev = prev + alpha * (samples[i] - prev);
    samples[i] = prev;
  }
}

function renderStage(stage) {
  const noteDur = NOTE_DURATIONS[stage];
  const loopLengthSec = MOTIF_NOTES.length * noteDur;
  const addOctave = OCTAVE_VOICES[stage];
  const wave = WAVEFORMS[stage];
  const totalSamples = Math.ceil(loopLengthSec * SAMPLE_RATE);
  const samples = new Float64Array(totalSamples);

  const addVoice = (midi, startSec, durationSec, gainScale) => {
    const freq = midiToFreq(midi);
    const peak = 0.5 * gainScale;
    const startSample = Math.round(startSec * SAMPLE_RATE);
    const durationSamples = Math.round(durationSec * SAMPLE_RATE);
    for (let i = 0; i < durationSamples; i++) {
      const idx = startSample + i;
      if (idx >= samples.length) break;
      const t = i / SAMPLE_RATE;
      const gain = envelopeGain(t, durationSec, peak);
      const phase = (freq * t) % 1;
      samples[idx] += oscillatorSample(wave, phase) * gain;
    }
  };

  MOTIF_NOTES.forEach((midi, i) => {
    const startSec = i * noteDur;
    addVoice(midi, startSec, noteDur, 1);
    if (addOctave) {
      addVoice(midi + 12, startSec, noteDur, 0.4);
    }
  });

  applyLowpass(samples, FILTER_CUTOFF[stage]);

  for (let i = 0; i < samples.length; i++) {
    samples[i] *= MASTER_GAIN;
  }

  return samples;
}

function encodeWav(samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const stage of Object.keys(NOTE_DURATIONS)) {
  const samples = renderStage(stage);
  const wav = encodeWav(samples);
  const filename = `boss-music-${stage}.wav`;
  fs.writeFileSync(path.join(OUT_DIR, filename), wav);
  console.log(`Wrote ${filename} (${(wav.length / 1024).toFixed(1)} KB)`);
}
