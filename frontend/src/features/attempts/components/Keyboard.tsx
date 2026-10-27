import { cn } from '@/lib/utils'
import { isBlackKey, noteLabel } from '@/lib/music'

const WHITE_WIDTH = 30
const WHITE_HEIGHT = 96
const BLACK_WIDTH = 18
const BLACK_HEIGHT = 58

interface Props {
  /** Key the score asks for. */
  expected?: number
  /** Key that was actually pressed (when different). */
  played?: number
}

/** A keyboard that shows which key to press (green) and which was pressed instead (red). */
export function Keyboard({ expected, played }: Props) {
  const marked = [expected, played].filter((pitch): pitch is number => pitch !== undefined)
  const lowest = marked.length ? Math.min(...marked) : 60
  const highest = marked.length ? Math.max(...marked) : 71
  const start = Math.floor(lowest / 12) * 12
  const octaves = highest >= start + 24 ? 3 : 2
  const end = start + octaves * 12

  const whites = Array.from({ length: end - start + 1 }, (_, i) => start + i).filter((p) => !isBlackKey(p))
  const whiteX = new Map(whites.map((pitch, index) => [pitch, index * WHITE_WIDTH]))

  const tone = (pitch: number) =>
    pitch === expected ? 'fill-emerald-400' : pitch === played ? 'fill-red-400' : undefined

  return (
    <svg width={whites.length * WHITE_WIDTH} height={WHITE_HEIGHT} role="img" aria-label="Клавиатура">
      {whites.map((pitch) => (
        <g key={pitch}>
          <rect x={whiteX.get(pitch)} width={WHITE_WIDTH} height={WHITE_HEIGHT} className={cn('stroke-border', tone(pitch) ?? 'fill-white')} />
          {pitch % 12 === 0 && (
            <text x={whiteX.get(pitch)! + WHITE_WIDTH / 2} y={WHITE_HEIGHT - 6} textAnchor="middle" className="fill-neutral-500 text-[10px]">
              C{Math.floor(pitch / 12) - 1}
            </text>
          )}
        </g>
      ))}
      {Array.from({ length: end - start + 1 }, (_, i) => start + i)
        .filter(isBlackKey)
        .map((pitch) => (
          <rect
            key={pitch}
            x={whiteX.get(pitch - 1)! + WHITE_WIDTH - BLACK_WIDTH / 2}
            width={BLACK_WIDTH}
            height={BLACK_HEIGHT}
            rx={2}
            className={cn('stroke-neutral-900', tone(pitch) ?? 'fill-neutral-900')}
          />
        ))}
      <title>{[expected !== undefined && `Нужно: ${noteLabel(expected)}`, played !== undefined && `Сыграно: ${noteLabel(played)}`].filter(Boolean).join(' · ')}</title>
    </svg>
  )
}
