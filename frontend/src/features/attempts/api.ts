import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/api'
import type { AttemptDetails, AttemptSummary } from '@/lib/types'

export const useAttempts = () =>
  useQuery({ queryKey: ['attempts'], queryFn: () => request<AttemptSummary[]>('/attempts') })

export const useAttempt = (id: string | undefined) =>
  useQuery({
    queryKey: ['attempts', id],
    queryFn: () => request<AttemptDetails>(`/attempts/${id}`),
    enabled: !!id,
  })

export const attemptAudioUrl = (id: string) => `/api/attempts/${id}/audio`

export function useCreateAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ scoreId, file }: { scoreId: string; file: File }) => {
      const body = new FormData()
      body.append('scoreId', scoreId)
      body.append('file', file)
      return request<AttemptDetails>('/attempts', { method: 'POST', body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attempts'] }),
  })
}
