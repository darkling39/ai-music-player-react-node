import { Badge } from '@/components/ui/badge'
import { describePosition, ERROR_LABELS } from '@/lib/music'
import { cn } from '@/lib/utils'
import type { PerformanceError } from '@/lib/types'

interface Props {
  errors: PerformanceError[]
  /** Plain-language explanation for each error, same order. */
  messages: string[]
  selected: number | null
  onSelect: (index: number | null) => void
}

export function ErrorList({ errors, messages, selected, onSelect }: Props) {
  if (errors.length === 0) {
    return <p className="text-sm text-muted-foreground">Ошибок не найдено: исполнение совпадает с нотами.</p>
  }
  return (
    <ul className="divide-y rounded-lg border">
      {errors.map((error, index) => (
        <li key={index}>
          <button
            type="button"
            onClick={() => onSelect(selected === index ? null : index)}
            className={cn('flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted', selected === index && 'bg-muted')}
          >
            <Badge variant={error.type === 'extra' || error.type === 'late' || error.type === 'early' ? 'outline' : 'destructive'} className="w-28 justify-center">
              {ERROR_LABELS[error.type]}
            </Badge>
            <span className="w-32 shrink-0 text-muted-foreground">{describePosition(error)}</span>
            <span>{messages[index]}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
