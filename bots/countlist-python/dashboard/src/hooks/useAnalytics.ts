import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/services/api'

export function useAnalyticsSummary(groupId?: number) {
  return useQuery({
    queryKey: ['analytics', 'summary', groupId],
    queryFn: () => analyticsApi.summary(groupId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useLimitStatus(groupId: number, month?: number, year?: number) {
  return useQuery({
    queryKey: ['analytics', 'limits', groupId, month, year],
    queryFn: () => analyticsApi.limits(groupId, month, year),
    enabled: !!groupId,
  })
}
