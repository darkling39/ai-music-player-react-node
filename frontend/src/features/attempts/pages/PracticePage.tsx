import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useScore, useScores } from '@/features/scores/api'
import { AttemptsList } from '../components/AttemptsList'
import { PianoRoll } from '../components/PianoRoll'
import { UploadCard } from '../components/UploadCard'

export function PracticePage() {
  const scores = useScores()
  const [chosen, setChosen] = useState<string>()
  const scoreId = chosen ?? scores.data?.[0]?.id
  const score = useScore(scoreId)

  if (scores.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Нет связи с сервером</AlertTitle>
        <AlertDescription>{scores.error.message}. Запустите проект командой «npm run dev».</AlertDescription>
      </Alert>
    )
  }
  if (!scores.data || !scoreId) return <Skeleton className="h-64 w-full" />

  return (
    <>
      <UploadCard scores={scores.data} scoreId={scoreId} onScoreChange={setChosen} />

      <Card>
        <CardHeader>
          <CardTitle>Эталон: {score.data?.title ?? '…'}</CardTitle>
          <CardDescription>Ноты, которые нужно сыграть. Номера сверху это такты.</CardDescription>
        </CardHeader>
        <CardContent>{score.data ? <PianoRoll score={score.data} /> : <Skeleton className="h-40 w-full" />}</CardContent>
      </Card>

      <AttemptsList />
    </>
  )
}
