const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SOLFEGE = ['До', 'До♯', 'Ре', 'Ре♯', 'Ми', 'Фа', 'Фа♯', 'Соль', 'Соль♯', 'Ля', 'Ля♯', 'Си'];

/** MIDI number -> scientific pitch name, e.g. 60 -> "C4". */
export function pitchName(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/** MIDI number -> name for the learner, e.g. 64 -> "Ми (E4)". */
export function pitchLabel(midi: number): string {
  return `${SOLFEGE[((midi % 12) + 12) % 12]} (${pitchName(midi)})`;
}
