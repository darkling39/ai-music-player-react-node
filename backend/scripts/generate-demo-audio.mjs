// Synthesises piano-like WAV "performances" of the seed score, with known mistakes,
// so analysis can be demonstrated and tested without a real recording.
// Usage (from backend/): npm run demo:audio   (builds first, writes ../demo/)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMusicXml } from '../dist/scores/parsers/musicxml.parser.js';

const SAMPLE_RATE = 22050;
const RELEASE = 0.08; // seconds of fade after a key is released
const outDir = join(import.meta.dirname, '..', '..', 'demo');
const score = parseMusicXml(readFileSync(join(import.meta.dirname, '..', 'src/scores/seed/ode-to-joy.musicxml'), 'utf8'));
const secondsPerBeat = 60 / score.tempoBpm;

const find = (notes, measure, beat) => notes.find((n) => n.measure === measure && n.beat === beat);

/** Deterministic pseudo-random jitter so output is reproducible. */
function jitterer(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296 - 0.5;
  };
}

function humanise(notes, maxJitterMs) {
  const random = jitterer(7);
  return notes.map((n) => ({ ...n, onset: Math.max(0, n.onset + (random() * 2 * maxJitterMs) / 1000) }));
}

function render(notes) {
  const end = Math.max(...notes.map((n) => n.onset + n.duration)) + 1.5;
  const samples = new Float32Array(Math.ceil(end * SAMPLE_RATE));
  for (const note of notes) {
    const freq = 440 * 2 ** ((note.pitch - 69) / 12);
    const length = Math.min(note.duration + RELEASE, 3);
    const start = Math.round(note.onset * SAMPLE_RATE);
    for (let i = 0; i < length * SAMPLE_RATE && start + i < samples.length; i++) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.005);
      const release = t > note.duration ? Math.max(0, 1 - (t - note.duration) / RELEASE) : 1;
      const decay = Math.exp(-t / 0.9);
      const upper = Math.exp(-t / 0.25); // upper partials die out faster, as on a real piano
      const tone = Math.sin(2 * Math.PI * freq * t) + upper * (0.4 * Math.sin(4 * Math.PI * freq * t) + 0.2 * Math.sin(6 * Math.PI * freq * t));
      samples[start + i] += 0.25 * attack * release * decay * tone;
    }
  }
  return samples;
}

function toWav(samples) {
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0) || 1;
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buffer.writeInt16LE(Math.round((s / peak) * 0.9 * 32767), 44 + i * 2));
  return buffer;
}

// Performance 1: clean, only natural timing jitter.
const clean = humanise(score.notes, 15);

// Performance 2: the same, plus deliberate mistakes (ground truth for the analyser).
const wrong = find(score.notes, 3, 4); // E4 played as D4
const missed = find(score.notes, 5, 2); // E4 skipped
const late = find(score.notes, 6, 1); // G4 140 ms late
const extraBeat = find(score.notes, 7, 2);
const mistakes = humanise(score.notes, 15)
  .filter((n) => !(n.measure === missed.measure && n.beat === missed.beat))
  .map((n) => {
    if (n.measure === wrong.measure && n.beat === wrong.beat) return { ...n, pitch: 62 };
    if (n.measure === late.measure && n.beat === late.beat) return { ...n, onset: n.onset + 0.14 };
    return n;
  });
mistakes.push({ pitch: 69, onset: extraBeat.onset + 0.3 * secondsPerBeat, duration: 0.3, measure: 7, beat: 2.3 }); // stray A4

const groundTruth = {
  score: score.title,
  tempoBpm: score.tempoBpm,
  'ode-to-joy-clean.wav': { errors: [] },
  'ode-to-joy-mistakes.wav': {
    errors: [
      { type: 'wrong_pitch', measure: wrong.measure, beat: wrong.beat, expected: wrong.pitch, played: 62 },
      { type: 'missed', measure: missed.measure, beat: missed.beat, expected: missed.pitch },
      { type: 'late', measure: late.measure, beat: late.beat, deviationMs: 140 },
      { type: 'extra', measure: 7, played: 69 },
    ],
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'ode-to-joy-clean.wav'), toWav(render(clean)));
writeFileSync(join(outDir, 'ode-to-joy-mistakes.wav'), toWav(render(mistakes)));
writeFileSync(join(outDir, 'ground-truth.json'), JSON.stringify(groundTruth, null, 2) + '\n');
console.log(`Wrote demo performances to ${outDir}`);
