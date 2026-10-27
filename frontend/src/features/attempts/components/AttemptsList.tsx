import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttempts } from '../api'

export function AttemptsList() {
  const { data, isPending } = useAttempts()
  return (
    <Card>
      <CardHeader>
        <CardTitle>История попыток</CardTitle>
        <CardDescription>Откройте попытку, чтобы увидеть разбор по тактам.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : data?.length ? (
          <ul className="divide-y">
            {data.map((attempt) => (
              <li key={attempt.id}>
                <Link to={`/attempts/${attempt.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
                  <span>
                    {attempt.scoreTitle}
                    <span className="ml-2 text-muted-foreground">{new Date(attempt.createdAt).toLocaleString('ru-RU')}</span>
                  </span>
                  <span className="tabular-nums">
                    <strong>{attempt.accuracy}%</strong>
                    <span className="ml-2 text-muted-foreground">ошибок: {attempt.errorCount}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Попыток пока нет.</p>
        )}
      </CardContent>
    </Card>
  )
}
