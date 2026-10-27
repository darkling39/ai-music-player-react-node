import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Feedback } from '@/lib/types'

export function Recommendations({ feedback }: { feedback: Feedback }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Рекомендации учителя</CardTitle>
        <CardDescription>{feedback.summary}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-sm font-medium">На что обратить внимание</h3>
          <ul className="space-y-3">
            {feedback.recommendations.map((item) => (
              <li key={item.title} className="text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {feedback.practicePlan.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">План на следующее занятие</h3>
            <ol className="space-y-3">
              {feedback.practicePlan.map((step, index) => (
                <li key={step.title} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
