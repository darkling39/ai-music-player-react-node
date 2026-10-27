import { cn } from '@/lib/utils'
import { isBlackKey } from '@/lib/music'
import type { PerformanceError, ScoreDetails, ScoreNote } from '@/lib/types'

const PX_PER_BEAT = 32
const ROW_HEIGHT = 12
const LEFT = 34
const TOP = 20

const LETTERS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

interface Props {
  score: Pick<ScoreDetails, 'notes' | 'tempoBpm' | 'beatsPerMeasure' | 'measures'>
  errors?: PerformanceError[]
  selected?: number | null
  onSelect?: (index: number | null) => void
}

/** Score as a piano roll. Notes are coloured by what happened to them; stray notes sit on top. */
export function PianoRoll({ score, errors = [], selected = null, onSelect }: Props) {
  const secondsPerBeat = 60 / score.tempoBpm
  const beatsAt = (measure: number, beat: number) => (measure - 1) * score.beatsPerMeasure + (beat - 1)

  const pitches = [
    ...score.notes.map((note) => note.pitch),
    ...errors.flatMap((error) => (error.playedPitch === undefined ? [] : [error.playedPitch])),
  ]
  const high = Math.max(...pitches) + 1
  const low = Math.min(...pitches) - 1
  const y = (pitch: number) => TOP + (high - pitch) * ROW_HEIGHT

  const width = LEFT + score.measures * score.beatsPerMeasure * PX_PER_BEAT
  const height = TOP + (high - low + 1) * ROW_HEIGHT

  const errorOf = (note: ScoreNote) =>
    errors.findIndex(
      (error) =>
        error.type !== 'extra' &&
        error.measure === note.measure &&
        Math.abs(error.beat - note.beat) < 0.01 &&
        error.expectedPitch === note.pitch,
    )

  const select = (index: number) => onSelect?.(selected === index ? null : index)

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <svg width={width} height={height} role="img" aria-label="Нотный график: ноты эталона и ошибки">
        {Array.from({ length: high - low + 1 }, (_, row) => {
          const pitch = high - row
          return (
            <g key={pitch}>
              <rect x={LEFT} y={y(pitch)} width={width - LEFT} height={ROW_HEIGHT} className={cn(isBlackKey(pitch) ? 'fill-muted' : 'fill-transparent')} />
              {pitch % 12 === 0 && (
                <text x={LEFT - 6} y={y(pitch) + ROW_HEIGHT - 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
                  {LETTERS[0]}{Math.floor(pitch / 12) - 1}
                </text>
              )}
            </g>
          )
        })}

        {Array.from({ length: score.measures + 1 }, (_, i) => (
          <g key={i}>
            <line x1={LEFT + i * score.beatsPerMeasure * PX_PER_BEAT} x2={LEFT + i * score.beatsPerMeasure * PX_PER_BEAT} y1={TOP - 4} y2={height} className="stroke-border" />
            {i < score.measures && (
              <text x={LEFT + i * score.beatsPerMeasure * PX_PER_BEAT + 4} y={12} className="fill-muted-foreground text-[10px]">
                {i + 1}
              </text>
            )}
          </g>
        ))}

        {score.notes.map((note) => {
          const index = errorOf(note)
          const error = index >= 0 ? errors[index] : undefined
          const x = LEFT + beatsAt(note.measure, note.beat) * PX_PER_BEAT
          const w = Math.max((note.duration / secondsPerBeat) * PX_PER_BEAT - 2, 6)
          return (
            <g key={`${note.measure}-${note.beat}-${note.pitch}`}>
              <rect
                x={x + 1}
                y={y(note.pitch) + 1}
                width={w}
                height={ROW_HEIGHT - 2}
                rx={2}
                className={cn(
                  !error && 'fill-emerald-500/70',
                  error?.type === 'wrong_pitch' && 'fill-red-500',
                  error?.type === 'missed' && 'fill-transparent stroke-red-500 [stroke-dasharray:3_2]',
                  (error?.type === 'early' || error?.type === 'late') && 'fill-amber-500',
                  index >= 0 && index === selected && 'stroke-foreground stroke-2',
                  error && 'cursor-pointer',
                )}
                onClick={error ? () => select(index) : undefined}
              />
              {error?.type === 'wrong_pitch' && error.playedPitch !== undefined && (
                <rect x={x + 1} y={y(error.playedPitch) + 1} width={w} height={ROW_HEIGHT - 2} rx={2} className="fill-red-500/20 stroke-red-500" />
              )}
            </g>
          )
        })}

        {errors.map((error, index) =>
          error.type === 'extra' && error.playedPitch !== undefined ? (
            <rect
              key={`extra-${index}`}
              x={LEFT + beatsAt(error.measure, error.beat) * PX_PER_BEAT}
              y={y(error.playedPitch) + 1}
              width={PX_PER_BEAT * 0.5}
              height={ROW_HEIGHT - 2}
              rx={2}
              className={cn('cursor-pointer fill-violet-500', index === selected && 'stroke-foreground stroke-2')}
              onClick={() => select(index)}
            />
          ) : null,
        )}
      </svg>
    </div>
  )
}

export function PianoRollLegend() {
  const items = [
    ['bg-emerald-500/70', 'Верно'],
    ['bg-red-500', 'Не та нота'],
    ['border border-dashed border-red-500', 'Пропуск'],
    ['bg-amber-500', 'Не вовремя'],
    ['bg-violet-500', 'Лишняя нота'],
  ] as const
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([style, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn('inline-block h-2.5 w-4 rounded-sm', style)} />
          {label}
        </li>
      ))}
    </ul>
  )
}
