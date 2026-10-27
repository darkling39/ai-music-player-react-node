import tonejs from '@tonejs/midi';
import type { ParsedScore, ScoreNote } from '../../common/domain/music.types.js';

// CJS package: named imports are not detected by Node's ESM loader.
const { Midi } = tonejs;

const DEFAULT_TEMPO = 100;

/** Reads a Standard MIDI File. Tempo and time signature are taken from the first meta event. */
export function parseMidi(source: Uint8Array, fallbackTitle = 'Untitled'): ParsedScore {
  const midi = new Midi(source);
  const tempoBpm = Math.round(midi.header.tempos[0]?.bpm ?? DEFAULT_TEMPO);
  const [numerator, denominator] = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];
  const beatsPerMeasure = (numerator * 4) / denominator;

  const notes: ScoreNote[] = midi.tracks
    .flatMap((track) => track.notes)
    .map((note) => {
      const quarters = note.ticks / midi.header.ppq;
      return {
        pitch: note.midi,
        onset: note.time,
        duration: note.duration,
        measure: Math.floor(quarters / beatsPerMeasure) + 1,
        beat: (quarters % beatsPerMeasure) + 1,
      };
    })
    .sort((a, b) => a.onset - b.onset || a.pitch - b.pitch);

  const lastMeasure = notes.reduce((max, note) => Math.max(max, note.measure), 0);
  return {
    title: midi.name || fallbackTitle,
    tempoBpm,
    beatsPerMeasure,
    measureCount: lastMeasure,
    notes,
  };
}
