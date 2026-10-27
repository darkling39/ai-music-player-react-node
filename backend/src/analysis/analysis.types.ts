import type { PerformanceError } from '../common/domain/music.types.js';

export interface MeasureReport {
  measure: number;
  /** Notes the score has in this measure. */
  notes: number;
  /** Notes played with the right pitch at the right time, as a share of `notes` (0..1). */
  accuracy: number;
  errors: number;
}

export interface AnalysisResult {
  /** Overall score 0..100: correct notes out of (score notes + extra notes). */
  accuracy: number;
  /** Share of score notes played with the right pitch, 0..100. */
  pitchAccuracy: number;
  /** Share of right-pitch notes that were also on time, 0..100. */
  timingAccuracy: number;
  counts: {
    referenceNotes: number;
    correct: number;
    wrongPitch: number;
    missed: number;
    extra: number;
    early: number;
    late: number;
    /** Weak detections treated as transcription noise rather than mistakes. */
    ignoredNoise: number;
  };
  tempo: { referenceBpm: number; playedBpm: number };
  errors: PerformanceError[];
  measures: MeasureReport[];
  /** Measures with at least one error, worst first. */
  problemMeasures: number[];
}
