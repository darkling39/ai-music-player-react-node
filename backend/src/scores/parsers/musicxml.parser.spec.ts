import { parseMusicXml } from './musicxml.parser.js';

const score = (measures: string, extra = '') => `<?xml version="1.0"?>
<score-partwise version="3.1">
  <work><work-title>Test</work-title></work>
  <identification><creator type="composer">Someone</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">${measures}</part>${extra}
</score-partwise>`;

const attributes = `<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
  <direction><sound tempo="120"/></direction>`;

const note = (step: string, octave: number, duration: number, extra = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>${extra}</note>`;

describe('parseMusicXml', () => {
  it('reads metadata, tempo and note positions', () => {
    const result = parseMusicXml(
      score(`<measure number="1">${attributes}${note('C', 4, 2)}${note('E', 4, 2)}<note><rest/><duration>4</duration></note></measure>
             <measure number="2">${note('G', 4, 4)}</measure>`),
    );

    expect(result).toMatchObject({ title: 'Test', composer: 'Someone', tempoBpm: 120, beatsPerMeasure: 4, measureCount: 2 });
    expect(result.notes).toEqual([
      { pitch: 60, onset: 0, duration: 0.5, measure: 1, beat: 1 },
      { pitch: 64, onset: 0.5, duration: 0.5, measure: 1, beat: 2 },
      { pitch: 67, onset: 2, duration: 1, measure: 2, beat: 1 },
    ]);
  });

  it('handles accidentals and chords', () => {
    const sharp = `<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration></note>`;
    const chordTone = `<note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration></note>`;
    const result = parseMusicXml(score(`<measure number="1">${attributes}${sharp}${chordTone}</measure>`));

    expect(result.notes.map((n) => [n.pitch, n.onset])).toEqual([
      [66, 0],
      [69, 0],
    ]);
  });

  it('merges tied notes into one longer note', () => {
    const result = parseMusicXml(
      score(`<measure number="1">${attributes}${note('C', 4, 8, '<tie type="start"/>')}</measure>
             <measure number="2">${note('C', 4, 4, '<tie type="stop"/>')}</measure>`),
    );

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject({ pitch: 60, onset: 0, duration: 3, measure: 1 });
  });

  it('places a second voice after <backup>', () => {
    const result = parseMusicXml(
      score(`<measure number="1">${attributes}${note('E', 5, 8)}<backup><duration>8</duration></backup>${note('C', 3, 4)}${note('G', 3, 4)}</measure>`),
    );

    expect(result.notes.map((n) => [n.pitch, n.onset])).toEqual([
      [48, 0],
      [76, 0],
      [55, 1],
    ]);
  });

  it('rejects documents that are not score-partwise', () => {
    expect(() => parseMusicXml('<score-timewise/>')).toThrow(/score-partwise/);
  });
});
