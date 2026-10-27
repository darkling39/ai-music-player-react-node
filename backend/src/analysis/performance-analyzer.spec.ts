import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NoteEvent } from '../common/domain/music.types.js';
import { parseMusicXml } from '../scores/parsers/musicxml.parser.js';
import { analyzePerformance } from './performance-analyzer.js';

const root = join(import.meta.dirname, '..', '..', '..');
const score = parseMusicXml(readFileSync(join(import.meta.dirname, '..', 'scores', 'seed', 'ode-to-joy.musicxml'), 'utf8'));
const transcription = (name: string) =>
  (JSON.parse(readFileSync(join(root, 'demo', `${name}.notes.json`), 'utf8')) as { notes: NoteEvent[] }).notes;
const groundTruth = JSON.parse(readFileSync(join(root, 'demo', 'ground-truth.json'), 'utf8'));

/** The reference played back exactly, optionally transformed. */
const perfect = (transform: (note: NoteEvent) => NoteEvent = (note) => note): NoteEvent[] =>
  score.notes.map(({ pitch, onset, duration }) => transform({ pitch, onset, duration, velocity: 0.8 }));

describe('analyzePerformance on transcribed demo recordings', () => {
  it('finds no errors in the clean performance', () => {
    const result = analyzePerformance(score, transcription('ode-to-joy-clean'));

    expect(result.errors).toEqual([]);
    expect(result.accuracy).toBe(100);
    expect(result.problemMeasures).toEqual([]);
  });

  it('finds exactly the mistakes recorded in ground-truth.json', () => {
    const result = analyzePerformance(score, transcription('ode-to-joy-mistakes'));
    const expected = groundTruth['ode-to-joy-mistakes.wav'].errors as {
      type: string;
      measure: number;
      expected?: number;
      played?: number;
    }[];

    expect(result.errors.map((e) => [e.type, e.measure])).toEqual(expected.map((e) => [e.type, e.measure]));
    const wrong = result.errors.find((e) => e.type === 'wrong_pitch')!;
    expect([wrong.expectedPitch, wrong.playedPitch]).toEqual([64, 62]);
    expect(result.errors.find((e) => e.type === 'late')!.deviationMs).toBeGreaterThan(100);
    expect(result.problemMeasures.sort()).toEqual([3, 5, 6, 7]);
    expect(result.errors.find((e) => e.type === 'extra')!.beat).toBeCloseTo(2.3, 1);
    expect(result.counts.ignoredNoise).toBe(1); // the weak stray detection is not blamed on the player
    expect(result.accuracy).toBeLessThan(90);
  });
});

describe('analyzePerformance on constructed performances', () => {
  it('does not blame a steady slower tempo and a late start on every note', () => {
    const result = analyzePerformance(score, perfect((n) => ({ ...n, onset: 2 + n.onset * 1.25 })));

    expect(result.errors).toEqual([]);
    expect(result.tempo.playedBpm).toBeCloseTo(score.tempoBpm / 1.25, 0);
  });

  it('reports a note held back as late and rushed as early', () => {
    const result = analyzePerformance(
      score,
      perfect((n) => {
        if (n.onset === score.notes[5].onset) return { ...n, onset: n.onset + 0.2 };
        if (n.onset === score.notes[10].onset) return { ...n, onset: n.onset - 0.2 };
        return n;
      }),
    );

    expect(result.errors.map((e) => e.type)).toEqual(['late', 'early']);
    expect(result.errors[0].deviationMs).toBe(200);
    expect(result.errors[1].deviationMs).toBe(-200);
  });

  it('puts a skipped note in the right measure and keeps the rest aligned', () => {
    const skipped = score.notes[13]; // last measure-4 note
    const result = analyzePerformance(score, perfect().filter((n) => n.onset !== skipped.onset));

    expect(result.errors).toEqual([{ type: 'missed', measure: skipped.measure, beat: skipped.beat, expectedPitch: skipped.pitch }]);
    expect(result.counts.correct).toBe(score.notes.length - 1);
  });

  it('treats far-away pitches as a missed plus an extra, not a wrong pitch', () => {
    const target = score.notes[3];
    const result = analyzePerformance(score, perfect((n) => (n.onset === target.onset ? { ...n, pitch: n.pitch + 7 } : n)));

    expect(result.errors.map((e) => e.type).sort()).toEqual(['extra', 'missed']);
  });

  it('scores an empty performance as all missed', () => {
    const result = analyzePerformance(score, []);

    expect(result.counts.missed).toBe(score.notes.length);
    expect(result.accuracy).toBe(0);
  });
});
