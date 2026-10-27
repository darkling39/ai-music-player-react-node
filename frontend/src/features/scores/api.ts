import { useQuery } from '@tanstack/react-query'
import { request } from '@/lib/api'
import type { ScoreDetails, ScoreSummary } from '@/lib/types'

export const useScores = () =>
  useQuery({ queryKey: ['scores'], queryFn: () => request<ScoreSummary[]>('/scores') })

export const useScore = (id: string | undefined) =>
  useQuery({
    queryKey: ['scores', id],
    queryFn: () => request<ScoreDetails>(`/scores/${id}`),
    enabled: !!id,
  })
