import tonejs from '@tonejs/midi';
import { parseMidi } from './midi.parser.js';

const { Midi } = tonejs;

function buildMidi() {
  const midi = new Midi();
  midi.name = 'Round trip';
  midi.header.setTempo(120);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] });
  const track = midi.addTrack();
  track.addNote({ midi: 60, time: 0, duration: 0.5 });
  track.addNote({ midi: 64, time: 0.5, duration: 0.5 });
  track.addNote({ midi: 67, time: 1.5, duration: 0.5 }); // 3 beats in -> measure 2
  return midi.toArray();
}

describe('parseMidi', () => {
  it('reads tempo, meter and note positions', () => {
    const result = parseMidi(buildMidi());

    expect(result).toMatchObject({ title: 'Round trip', tempoBpm: 120, beatsPerMeasure: 3, measureCount: 2 });
    expect(result.notes.map((n) => [n.pitch, n.measure, n.beat])).toEqual([
      [60, 1, 1],
      [64, 1, 2],
      [67, 2, 1],
    ]);
    expect(result.notes[2].onset).toBeCloseTo(1.5);
  });
});
