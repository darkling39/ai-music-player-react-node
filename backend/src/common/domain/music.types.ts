/** A single note, in the same shape for reference scores and transcribed performances. */
export interface NoteEvent {
  /** MIDI pitch number, 60 = C4. */
  pitch: number;
  /** Onset in seconds from the start of the piece. */
  onset: number;
  /** Duration in seconds. */
  duration: number;
  /** Detector confidence / loudness, 0..1. Only present on transcribed notes. */
  velocity?: number;
}

export type ErrorType = 'missed' | 'extra' | 'wrong_pitch' | 'early' | 'late';

export interface PerformanceError {
  type: ErrorType;
  /** 1-based measure number in the reference score (for 'extra', where the stray note fell). */
  measure: number;
  /** Beat inside the measure, as in {@link ScoreNote.beat}. */
  beat: number;
  /** MIDI pitch the score asks for. Absent for 'extra'. */
  expectedPitch?: number;
  /** MIDI pitch that was actually played. Absent for 'missed'. */
  playedPitch?: number;
  /** Signed timing deviation in ms (positive = late). Only for 'early' / 'late'. */
  deviationMs?: number;
}

/** A note of a reference score, located both in time and on the page. */
export interface ScoreNote extends NoteEvent {
  /** 1-based measure number. */
  measure: number;
  /** 1-based beat inside the measure, in quarter notes (1 = downbeat, 2.5 = the "and" of beat 2). */
  beat: number;
}

/** Format-independent result of reading MusicXML or MIDI. Tempo is assumed constant. */
export interface ParsedScore {
  title: string;
  composer?: string;
  tempoBpm: number;
  /** Measure length in quarter notes (4/4 = 4, 3/4 = 3, 6/8 = 3). */
  beatsPerMeasure: number;
  measureCount: number;
  notes: ScoreNote[];
}
