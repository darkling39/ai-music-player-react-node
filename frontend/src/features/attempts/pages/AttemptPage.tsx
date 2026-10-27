import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useScore } from '@/features/scores/api'
import { describePosition } from '@/lib/music'
import { attemptAudioUrl, useAttempt } from '../api'
import { ErrorList } from '../components/ErrorList'
import { Keyboard } from '../components/Keyboard'
import { MeasureStrip } from '../components/MeasureStrip'
import { PianoRoll, PianoRollLegend } from '../components/PianoRoll'
import { Recommendations } from '../components/Recommendations'
import { SummaryCards } from '../components/SummaryCards'

export function AttemptPage() {
  const { id } = useParams()
  const attempt = useAttempt(id)
  const score = useScore(attempt.data?.scoreId)
  const [selected, setSelected] = useState<number | null>(null)

  if (attempt.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Попытка не найдена</AlertTitle>
        <AlertDescription>{attempt.error.message}</AlertDescription>
      </Alert>
    )
  }
  if (!attempt.data || !score.data) return <Skeleton className="h-96 w-full" />

  const { analysis, feedback } = attempt.data
  const error = selected === null ? undefined : analysis.errors[selected]
  const selectMeasure = (measure: number) => setSelected(analysis.errors.findIndex((e) => e.measure === measure))

  return (
    <>
      <div className="space-y-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> К попыткам
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Разбор: {attempt.data.scoreTitle}</h1>
            <p className="text-sm text-muted-foreground">{new Date(attempt.data.createdAt).toLocaleString('ru-RU')}</p>
          </div>
          <audio controls src={attemptAudioUrl(attempt.data.id)} className="h-9" />
        </div>
      </div>

      <SummaryCards analysis={analysis} />

      <Recommendations feedback={feedback} />

      <Card>
        <CardHeader>
          <CardTitle>Проблемные такты</CardTitle>
          <CardDescription>
            {analysis.problemMeasures.length
              ? `Больше всего ошибок в тактах: ${analysis.problemMeasures.join(', ')}`
              : 'Все такты сыграны чисто.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeasureStrip measures={analysis.measures} active={error?.measure ?? null} onSelect={selectMeasure} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Где ошибки</CardTitle>
          <CardDescription>Нажмите на ноту или ошибку, чтобы увидеть, какую клавишу нужно было нажать.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PianoRoll score={score.data} errors={analysis.errors} selected={selected} onSelect={setSelected} />
          <PianoRollLegend />
          {error && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/40 p-3">
              <Keyboard
                expected={error.expectedPitch}
                played={error.playedPitch !== error.expectedPitch ? error.playedPitch : undefined}
              />
              <div className="space-y-1 text-sm">
                <p className="font-medium">{describePosition(error)}</p>
                <p>{feedback.errorMessages[selected!]}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="mr-3 inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-emerald-400" />нужная клавиша</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-red-400" />нажатая клавиша</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Все ошибки</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorList errors={analysis.errors} messages={feedback.errorMessages} selected={selected} onSelect={setSelected} />
        </CardContent>
      </Card>
    </>
  )
}
