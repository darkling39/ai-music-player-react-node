/** A single note, in the same shape for reference scores and transcribed performances. */
export interface NoteEvent {
  /** MIDI pitch number, 60 = C4. */
  pitch: number;
  /** Onset in seconds from the start of the piece. */
  onset: number;
  /** Duration in seconds. */
  duration: number;
}

export type ErrorType = 'missed' | 'extra' | 'wrong_pitch' | 'early' | 'late';

export interface PerformanceError {
  type: ErrorType;
  /** 1-based measure number in the reference score. */
  measure: number;
  expected?: NoteEvent;
  played?: NoteEvent;
  /** Signed timing deviation in ms (positive = late). */
  deviationMs?: number;
}
