import type { NoteEvent, ParsedScore, PerformanceError, ScoreNote } from '../common/domain/music.types.js';
import { alignNotes } from './alignment.js';
import type { AnalysisResult, MeasureReport } from './analysis.types.js';
import { fitTempoMap } from './tempo-map.js';

/** Timing slack: a note is on time within this share of a beat, but never tighter than the floor. */
const TIMING_TOLERANCE_BEATS = 0.15;
const TIMING_TOLERANCE_FLOOR_MS = 90;
/** Detections quieter than this share of the median are treated as transcriber noise, not extra notes. */
const NOISE_VELOCITY_RATIO = 0.8;

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10);

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Drops weak detections (re-triggered tails, overtones) so they are not reported as extra notes. */
function removeNoise(performed: NoteEvent[]): { kept: NoteEvent[]; ignored: number } {
  const velocities = performed.flatMap((note) => (note.velocity === undefined ? [] : [note.velocity]));
  if (velocities.length < performed.length || !velocities.length) return { kept: performed, ignored: 0 };
  const threshold = NOISE_VELOCITY_RATIO * median(velocities);
  const kept = performed.filter((note) => note.velocity! >= threshold);
  return { kept, ignored: performed.length - kept.length };
}

/** Compares a transcribed performance with the reference score and classifies every difference. */
export function analyzePerformance(score: ParsedScore, performed: NoteEvent[]): AnalysisResult {
  const { kept, ignored } = removeNoise(performed);
  const pairs = alignNotes<ScoreNote>(score.notes, kept);

  const samePitch = pairs.filter((pair) => pair.ref && pair.perf && pair.ref.pitch === pair.perf.pitch);
  const map = fitTempoMap(samePitch.map((pair) => [pair.ref!.onset, pair.perf!.onset]));

  const secondsPerBeat = 60 / score.tempoBpm;
  const toleranceS = Math.max(TIMING_TOLERANCE_FLOOR_MS / 1000, TIMING_TOLERANCE_BEATS * secondsPerBeat);

  /** Where a performed onset falls in the score, once tempo and offset are undone. */
  const locate = (onset: number) => {
    const quarters = Math.max(0, (onset - map.offset) / map.scale / secondsPerBeat);
    const measure = Math.min(score.measureCount, Math.floor(quarters / score.beatsPerMeasure) + 1);
    return { measure, beat: Math.round(((quarters % score.beatsPerMeasure) + 1) * 100) / 100 };
  };

  const errors: PerformanceError[] = [];
  const correctByMeasure = new Map<number, number>();
  const errorsByMeasure = new Map<number, number>();
  const counts = { correct: 0, wrongPitch: 0, missed: 0, extra: 0, early: 0, late: 0 };
  const addError = (error: PerformanceError) => {
    errors.push(error);
    errorsByMeasure.set(error.measure, (errorsByMeasure.get(error.measure) ?? 0) + 1);
  };

  for (const { ref, perf } of pairs) {
    if (ref && !perf) {
      counts.missed++;
      addError({ type: 'missed', measure: ref.measure, beat: ref.beat, expectedPitch: ref.pitch });
    } else if (!ref && perf) {
      counts.extra++;
      addError({ type: 'extra', ...locate(perf.onset), playedPitch: perf.pitch });
    } else if (ref && perf && ref.pitch !== perf.pitch) {
      counts.wrongPitch++;
      addError({
        type: 'wrong_pitch',
        measure: ref.measure,
        beat: ref.beat,
        expectedPitch: ref.pitch,
        playedPitch: perf.pitch,
      });
    } else if (ref && perf) {
      const deviation = perf.onset - (map.scale * ref.onset + map.offset);
      if (Math.abs(deviation) <= toleranceS) {
        counts.correct++;
        correctByMeasure.set(ref.measure, (correctByMeasure.get(ref.measure) ?? 0) + 1);
      } else {
        const type = deviation > 0 ? 'late' : 'early';
        counts[type]++;
        addError({
          type,
          measure: ref.measure,
          beat: ref.beat,
          expectedPitch: ref.pitch,
          playedPitch: perf.pitch,
          deviationMs: Math.round(deviation * 1000),
        });
      }
    }
  }

  const measures: MeasureReport[] = Array.from({ length: score.measureCount }, (_, index) => {
    const measure = index + 1;
    const notes = score.notes.filter((note) => note.measure === measure).length;
    return {
      measure,
      notes,
      accuracy: notes === 0 ? 1 : Math.round(((correctByMeasure.get(measure) ?? 0) / notes) * 100) / 100,
      errors: errorsByMeasure.get(measure) ?? 0,
    };
  });

  const referenceNotes = score.notes.length;
  const rightPitch = samePitch.length;
  return {
    accuracy: percent(counts.correct, referenceNotes + counts.extra),
    pitchAccuracy: percent(rightPitch, referenceNotes),
    timingAccuracy: percent(counts.correct, rightPitch),
    counts: { referenceNotes, ...counts, ignoredNoise: ignored },
    tempo: {
      referenceBpm: score.tempoBpm,
      playedBpm: Math.round((score.tempoBpm / map.scale) * 10) / 10,
    },
    errors: errors.sort((a, b) => a.measure - b.measure || a.beat - b.beat),
    measures,
    problemMeasures: measures
      .filter((report) => report.errors > 0)
      .sort((a, b) => b.errors - a.errors || a.measure - b.measure)
      .map((report) => report.measure),
  };
}
