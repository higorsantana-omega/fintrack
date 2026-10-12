import { useQuery } from '@tanstack/react-query'
import { goalsService } from '../services/goalsService'

export function useGoalsSummary () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['goals', 'summary'],
    queryFn: goalsService.getSummary
  })

  return { summary: data, isFetching, isInitialLoading }
}
