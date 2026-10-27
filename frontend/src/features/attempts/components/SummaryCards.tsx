import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { AnalysisResult } from '@/lib/types'

function Metric({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}%</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={value} />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function SummaryCards({ analysis }: { analysis: AnalysisResult }) {
  const { counts, tempo } = analysis
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Общая точность" value={analysis.accuracy} hint={`${counts.correct} из ${counts.referenceNotes} нот сыграно верно и вовремя`} />
        <Metric title="Высота нот" value={analysis.pitchAccuracy} hint="Доля нот эталона, сыгранных правильно" />
        <Metric title="Ритм" value={analysis.timingAccuracy} hint="Доля верных нот, сыгранных в такт" />
        <Card size="sm">
          <CardHeader>
            <CardDescription>Темп</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{tempo.playedBpm} BPM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">В эталоне {tempo.referenceBpm} BPM</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Ошибок: {analysis.errors.length}</span>
        {counts.wrongPitch > 0 && <Badge variant="destructive">Не та нота · {counts.wrongPitch}</Badge>}
        {counts.missed > 0 && <Badge variant="destructive">Пропуски · {counts.missed}</Badge>}
        {counts.extra > 0 && <Badge variant="secondary">Лишние · {counts.extra}</Badge>}
        {counts.late + counts.early > 0 && <Badge variant="outline">Ритм · {counts.late + counts.early}</Badge>}
        {counts.ignoredNoise > 0 && (
          <span className="text-xs text-muted-foreground">
            Слабых срабатываний распознавания, не засчитанных как ошибки: {counts.ignoredNoise}
          </span>
        )}
      </div>
    </div>
  )
}
