import { useQuery } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { request } from '@/lib/api'
import type { ScoreSummary } from '@/lib/types'
import { useCreateAttempt } from '../api'

const DEMO_LABELS: Record<string, string> = {
  'ode-to-joy-clean.wav': 'Демо: чистое исполнение',
  'ode-to-joy-mistakes.wav': 'Демо: исполнение с ошибками',
}

interface Props {
  scores: ScoreSummary[]
  scoreId: string
  onScoreChange: (id: string) => void
}

export function UploadCard({ scores, scoreId, onScoreChange }: Props) {
  const navigate = useNavigate()
  const create = useCreateAttempt()
  const [file, setFile] = useState<File | null>(null)
  const demos = useQuery({ queryKey: ['demo'], queryFn: () => request<{ name: string }[]>('/demo') })

  const analyse = (recording: File) =>
    create.mutate({ scoreId, file: recording }, { onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`) })

  const analyseDemo = async (name: string) => {
    const blob = await (await fetch(`/api/demo/${name}`)).blob()
    analyse(new File([blob], name, { type: 'audio/wav' }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая попытка</CardTitle>
        <CardDescription>Загрузите запись игры (аудио или видео), и ИИ-учитель сравнит её с нотами.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Произведение</span>
          <select
            value={scoreId}
            onChange={(event) => onScoreChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {scores.map((score) => (
              <option key={score.id} value={score.id}>
                {score.title} · {score.composer ?? 'без автора'} · {score.measures} тактов
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Запись</span>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!file || create.isPending} onClick={() => file && analyse(file)}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
            {create.isPending ? 'Слушаю запись…' : 'Проанализировать'}
          </Button>
          {demos.data?.map(({ name }) => (
            <Button key={name} variant="outline" disabled={create.isPending} onClick={() => analyseDemo(name)}>
              {DEMO_LABELS[name] ?? name}
            </Button>
          ))}
        </div>

        {create.isError && (
          <Alert variant="destructive">
            <AlertTitle>Не удалось разобрать запись</AlertTitle>
            <AlertDescription>{create.error.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
