import { cn } from '@/lib/utils'
import type { MeasureReport } from '@/lib/types'

interface Props {
  measures: MeasureReport[]
  /** Measure of the currently selected error. */
  active: number | null
  onSelect: (measure: number) => void
}

const tone = ({ errors, accuracy }: MeasureReport) =>
  errors === 0
    ? 'border-emerald-500/50 bg-emerald-500/10'
    : accuracy >= 0.75
      ? 'border-amber-500/60 bg-amber-500/10'
      : 'border-red-500/60 bg-red-500/10'

/** One tile per measure: where the trouble is, at a glance. Click to jump to that measure's first error. */
export function MeasureStrip({ measures, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {measures.map((report) => (
        <button
          key={report.measure}
          type="button"
          disabled={report.errors === 0}
          onClick={() => onSelect(report.measure)}
          className={cn(
            'rounded-lg border p-2 text-left transition disabled:cursor-default',
            tone(report),
            report.errors > 0 && 'hover:brightness-95',
            active === report.measure && 'ring-2 ring-foreground',
          )}
        >
          <div className="text-xs text-muted-foreground">Такт {report.measure}</div>
          <div className="text-lg font-semibold tabular-nums">{Math.round(report.accuracy * 100)}%</div>
          <div className="text-xs">{report.errors === 0 ? 'без ошибок' : `ошибок: ${report.errors}`}</div>
        </button>
      ))}
    </div>
  )
}
