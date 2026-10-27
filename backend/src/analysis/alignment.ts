import type { NoteEvent } from '../common/domain/music.types.js';

export interface AlignedPair<R extends NoteEvent = NoteEvent> {
  /** Null when the performer played a note the score does not have. */
  ref: R | null;
  /** Null when the performer skipped a note of the score. */
  perf: NoteEvent | null;
}

const CHORD_WINDOW_S = 0.04;
const GAP_COST = 1;
const SUBSTITUTION_COST = 0.6;
const MAX_SUBSTITUTION_SEMITONES = 2;
const TIME_WEIGHT = 1;

/** Sorts by onset, and by pitch inside near-simultaneous groups so chords have a stable order. */
export function orderNotes<T extends NoteEvent>(notes: T[]): T[] {
  const sorted = [...notes].sort((a, b) => a.onset - b.onset);
  const ordered: T[] = [];
  let group: T[] = [];
  for (const note of sorted) {
    if (group.length && note.onset - group[0].onset > CHORD_WINDOW_S) {
      ordered.push(...group.sort((a, b) => a.pitch - b.pitch));
      group = [];
    }
    group.push(note);
  }
  return [...ordered, ...group.sort((a, b) => a.pitch - b.pitch)];
}

/** Onset as a 0..1 position inside the piece, so tempo and leading silence do not matter. */
function relativePositions(notes: NoteEvent[]): number[] {
  if (!notes.length) return [];
  const start = notes[0].onset;
  const span = Math.max(notes[notes.length - 1].onset - start, 1e-6);
  return notes.map((note) => (note.onset - start) / span);
}

/**
 * Aligns performed notes to reference notes with dynamic programming (the same recurrence as DTW,
 * extended with skips): a note can match, be substituted by a close pitch, be missed, or be extra.
 * Time only breaks ties here (via relative position); real timing is judged afterwards.
 */
export function alignNotes<R extends NoteEvent>(reference: R[], performed: NoteEvent[]): AlignedPair<R>[] {
  const ref = orderNotes(reference);
  const perf = orderNotes(performed);
  const refPos = relativePositions(ref);
  const perfPos = relativePositions(perf);
  const n = ref.length;
  const m = perf.length;
  const width = m + 1;

  const cost = new Float64Array((n + 1) * width);
  // 0 = diagonal (match / substitute), 1 = ref only (missed), 2 = perf only (extra)
  const step = new Uint8Array((n + 1) * width);
  for (let i = 1; i <= n; i++) {
    cost[i * width] = i * GAP_COST;
    step[i * width] = 1;
  }
  for (let j = 1; j <= m; j++) {
    cost[j] = j * GAP_COST;
    step[j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const semitones = Math.abs(ref[i - 1].pitch - perf[j - 1].pitch);
      let best = cost[(i - 1) * width + j] + GAP_COST;
      let choice = 1;
      const extra = cost[i * width + j - 1] + GAP_COST;
      if (extra < best) {
        best = extra;
        choice = 2;
      }
      if (semitones <= MAX_SUBSTITUTION_SEMITONES) {
        const timePenalty = TIME_WEIGHT * Math.abs(refPos[i - 1] - perfPos[j - 1]);
        const diagonal = cost[(i - 1) * width + j - 1] + (semitones === 0 ? 0 : SUBSTITUTION_COST) + timePenalty;
        if (diagonal <= best) {
          best = diagonal;
          choice = 0;
        }
      }
      cost[i * width + j] = best;
      step[i * width + j] = choice;
    }
  }

  const pairs: AlignedPair<R>[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const choice = step[i * width + j];
    if (choice === 0) pairs.push({ ref: ref[--i], perf: perf[--j] });
    else if (choice === 1) pairs.push({ ref: ref[--i], perf: null });
    else pairs.push({ ref: null, perf: perf[--j] });
  }
  return pairs.reverse();
}
