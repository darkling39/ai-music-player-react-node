import type { PerformanceError } from '@/lib/types'

const SOLFEGE = ['До', 'До♯', 'Ре', 'Ре♯', 'Ми', 'Фа', 'Фа♯', 'Соль', 'Соль♯', 'Ля', 'Ля♯', 'Си']
const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12)

/** "Ми (E4)" */
export function noteLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${SOLFEGE[midi % 12]} (${LETTERS[midi % 12]}${octave})`
}

export const ERROR_LABELS: Record<PerformanceError['type'], string> = {
  wrong_pitch: 'Не та нота',
  missed: 'Пропуск',
  extra: 'Лишняя нота',
  late: 'Позже',
  early: 'Раньше',
}

/** "Такт 3, доля 4" */
export const describePosition = (error: PerformanceError) =>
  `Такт ${error.measure}, доля ${Number.isInteger(error.beat) ? error.beat : error.beat.toFixed(1)}`
