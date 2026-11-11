#!/usr/bin/env node
/**
 * Generates the short UI sound-effect WAV files bundled by apps/native's
 * sound helper (src/utils/sound.ts).
 *
 * apps/web's `utils/sound.ts` synthesizes these tones on the fly with the
 * Web Audio API - no asset files needed there. React Native has no
 * equivalent "generate a tone from an oscillator at call time" API
 * (expo-audio only plays pre-existing audio sources), so this script
 * renders the exact same tone patterns (same frequencies/durations/
 * gains/delays, same linear-attack + exponential-decay envelope) to WAV
 * files once, ahead of time, which the app then just plays back.
 *
 * apps/web/src/utils/sound.ts's SOUND_PATTERNS remains the single source
 * of truth for these patterns; re-run this whenever it changes:
 *
 *   node scripts/generate-native-sound-assets.cjs
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'apps/native/assets/sounds');

const SAMPLE_RATE = 44100;

// Mirrors apps/web/src/utils/sound.ts's SOUND_PATTERNS exactly.
const SOUND_PATTERNS = {
  add: [{ frequency: 720, durationMs: 30, gain: 0.05 }],
  remove: [{ frequency: 320, durationMs: 35, gain: 0.05 }],
  move: [{ frequency: 500, durationMs: 15, gain: 0.03 }],
  submit: [
    { frequency: 600, durationMs: 30, gain: 0.06 },
    { frequency: 900, durationMs: 40, delayMs: 40, gain: 0.06 }
  ],
  overlay: [{ frequency: 450, durationMs: 20, gain: 0.04 }],
  unlock: [
    { frequency: 700, durationMs: 30, gain: 0.07 },
    { frequency: 1000, durationMs: 30, delayMs: 40, gain: 0.07 },
    { frequency: 1300, durationMs: 50, delayMs: 80, gain: 0.07 }
  ],
  click: [{ frequency: 400, durationMs: 20, gain: 0.04 }],
  yourTurn: [
    { frequency: 880, durationMs: 30, gain: 0.06 },
    { frequency: 1175, durationMs: 40, delayMs: 60, gain: 0.06 }
  ],
  win: [
    { frequency: 660, durationMs: 40, gain: 0.07 },
    { frequency: 880, durationMs: 40, delayMs: 60, gain: 0.07 },
    { frequency: 1320, durationMs: 90, delayMs: 120, gain: 0.08 }
  ],
  lose: [
    { frequency: 420, durationMs: 60, gain: 0.07 },
    { frequency: 280, durationMs: 120, delayMs: 80, gain: 0.07 }
  ],
  pass: [{ frequency: 220, durationMs: 60, gain: 0.05 }]
};

/** Same envelope as web's playTone(): 3ms linear attack up to the step's
 * peak gain, then an exponential decay to (near) silence by the end of
 * the step's duration. */
function envelopeGain(tSeconds, durationSeconds, peakGain) {
  const attackSeconds = 0.003;
  if (tSeconds < attackSeconds) {
    return (peakGain * tSeconds) / attackSeconds;
  }
  const decayStart = attackSeconds;
  const decayDuration = Math.max(durationSeconds - decayStart, 0.0001);
  const decayT = Math.min((tSeconds - decayStart) / decayDuration, 1);
  // exponentialRampToValueAtTime(0.0001, ...) - matches the ~-74dB floor
  // web's oscillator ramps down to.
  const floor = 0.0001;
  return peakGain * Math.pow(floor / peakGain, decayT);
}

function renderPattern(steps) {
  const totalSeconds = Math.max(...steps.map(s => (s.delayMs ?? 0) / 1000 + s.durationMs / 1000)) + 0.02;
  const totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE);
  const samples = new Float64Array(totalSamples);

  for (const step of steps) {
    const startSample = Math.round(((step.delayMs ?? 0) / 1000) * SAMPLE_RATE);
    const durationSeconds = step.durationMs / 1000;
    const stepSamples = Math.round(durationSeconds * SAMPLE_RATE);
    const peakGain = step.gain ?? 0.05;

    for (let i = 0; i < stepSamples; i++) {
      const t = i / SAMPLE_RATE;
      const gain = envelopeGain(t, durationSeconds, peakGain);
      const value = Math.sin(2 * Math.PI * step.frequency * t) * gain;
      const idx = startSample + i;
      if (idx < samples.length) {
        samples[idx] += value;
      }
    }
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

for (const [name, steps] of Object.entries(SOUND_PATTERNS)) {
  const samples = renderPattern(steps);
  const wav = encodeWav(samples);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.wav`), wav);
  console.log(`Wrote ${name}.wav (${(wav.length / 1024).toFixed(1)} KB)`);
}
