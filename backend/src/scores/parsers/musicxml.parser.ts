import { XMLParser } from 'fast-xml-parser';
import type { ParsedScore, ScoreNote } from '../../common/domain/music.types.js';

type XmlNode = { [tag: string]: unknown; ':@'?: Record<string, string> };

const xml = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
});

const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DEFAULT_TEMPO = 100;
const TIE_EPSILON = 1e-6;

const tagOf = (node: XmlNode) => Object.keys(node).find((key) => key !== ':@') ?? '';
const kids = (node: XmlNode): XmlNode[] => {
  const value = node[tagOf(node)];
  return Array.isArray(value) ? (value as XmlNode[]) : [];
};
const find = (node: XmlNode | undefined, tag: string) =>
  node ? kids(node).find((child) => tagOf(child) === tag) : undefined;
const findAll = (node: XmlNode | undefined, tag: string) =>
  node ? kids(node).filter((child) => tagOf(child) === tag) : [];
const textOf = (node: XmlNode | undefined) => {
  const textNode = node ? kids(node).find((child) => '#text' in child) : undefined;
  return textNode ? String(textNode['#text']) : undefined;
};
const numberOf = (node: XmlNode | undefined) => {
  const text = textOf(node);
  return text === undefined ? undefined : Number(text);
};
const attrOf = (node: XmlNode | undefined, name: string) => node?.[':@']?.[`@_${name}`];

/** Quarter-note multiplier for the beat unit of a <metronome> marking. */
const BEAT_UNIT_QUARTERS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  '16th': 0.25,
};

function pitchToMidi(pitch: XmlNode): number {
  const step = textOf(find(pitch, 'step')) ?? 'C';
  const alter = numberOf(find(pitch, 'alter')) ?? 0;
  const octave = numberOf(find(pitch, 'octave')) ?? 4;
  return (octave + 1) * 12 + STEP_SEMITONES[step] + alter;
}

function readTempo(measure: XmlNode): number | undefined {
  for (const child of kids(measure)) {
    const tag = tagOf(child);
    if (tag === 'sound' && attrOf(child, 'tempo')) return Number(attrOf(child, 'tempo'));
    if (tag !== 'direction') continue;
    const sound = find(child, 'sound');
    if (sound && attrOf(sound, 'tempo')) return Number(attrOf(sound, 'tempo'));
    const metronome = find(find(find(child, 'direction-type'), 'metronome'), 'per-minute');
    const unit = textOf(find(find(find(child, 'direction-type'), 'metronome'), 'beat-unit'));
    if (metronome) return numberOf(metronome)! * (BEAT_UNIT_QUARTERS[unit ?? 'quarter'] ?? 1);
  }
  return undefined;
}

/** Reads a score-partwise MusicXML document. All parts are merged into one note list. */
export function parseMusicXml(source: string): ParsedScore {
  const root = (xml.parse(source) as XmlNode[]).find((node) => tagOf(node) === 'score-partwise');
  if (!root) throw new Error('Unsupported MusicXML: expected a score-partwise document');

  const title =
    textOf(find(find(root, 'work'), 'work-title')) ?? textOf(find(root, 'movement-title')) ?? 'Untitled';
  const composer = findAll(find(root, 'identification'), 'creator').find(
    (creator) => attrOf(creator, 'type') === 'composer',
  );

  let tempoBpm: number | undefined;
  let beatsPerMeasure = 4;
  let measureCount = 0;
  const notes: ScoreNote[] = [];

  for (const part of findAll(root, 'part')) {
    let divisions = 1;
    let measureStart = 0; // in quarter notes
    const partNotes: ScoreNote[] = [];
    const measures = findAll(part, 'measure');
    measureCount = Math.max(measureCount, measures.length);

    measures.forEach((measure, index) => {
      let cursor = measureStart;
      let furthest = measureStart;
      let lastOnset = measureStart;
      tempoBpm ??= readTempo(measure);

      for (const child of kids(measure)) {
        const tag = tagOf(child);
        if (tag === 'attributes') {
          divisions = numberOf(find(child, 'divisions')) ?? divisions;
          const time = find(child, 'time');
          if (time) {
            const beats = numberOf(find(time, 'beats')) ?? 4;
            const beatType = numberOf(find(time, 'beat-type')) ?? 4;
            beatsPerMeasure = (beats * 4) / beatType;
          }
        } else if (tag === 'backup') {
          cursor -= (numberOf(find(child, 'duration')) ?? 0) / divisions;
        } else if (tag === 'forward') {
          cursor += (numberOf(find(child, 'duration')) ?? 0) / divisions;
          furthest = Math.max(furthest, cursor);
        } else if (tag === 'note') {
          if (find(child, 'grace')) continue;
          const duration = (numberOf(find(child, 'duration')) ?? 0) / divisions;
          const isChord = !!find(child, 'chord');
          const onset = isChord ? lastOnset : cursor;
          const pitch = find(child, 'pitch');
          if (!isChord) {
            lastOnset = cursor;
            cursor += duration;
            furthest = Math.max(furthest, cursor);
          }
          if (!pitch) continue; // rest

          const midi = pitchToMidi(pitch);
          const tiedFromPrevious = findAll(child, 'tie').some((tie) => attrOf(tie, 'type') === 'stop');
          const open = tiedFromPrevious
            ? [...partNotes]
                .reverse()
                .find((note) => note.pitch === midi && Math.abs(note.onset + note.duration - onset) < TIE_EPSILON)
            : undefined;
          if (open) {
            open.duration += duration; // still in quarter notes, converted to seconds below
            continue;
          }
          partNotes.push({
            pitch: midi,
            onset,
            duration,
            measure: index + 1,
            beat: onset - measureStart + 1,
          });
        }
      }

      const implicit = attrOf(measure, 'implicit') === 'yes';
      measureStart = implicit ? furthest : measureStart + beatsPerMeasure;
    });
    notes.push(...partNotes);
  }

  const bpm = tempoBpm ?? DEFAULT_TEMPO;
  const secondsPerQuarter = 60 / bpm;
  return {
    title,
    composer: textOf(composer),
    tempoBpm: bpm,
    beatsPerMeasure,
    measureCount,
    notes: notes
      .map((note) => ({
        ...note,
        onset: note.onset * secondsPerQuarter,
        duration: note.duration * secondsPerQuarter,
      }))
      .sort((a, b) => a.onset - b.onset || a.pitch - b.pitch),
  };
}
