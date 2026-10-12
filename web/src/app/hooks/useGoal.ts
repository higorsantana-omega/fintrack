import { useQuery } from '@tanstack/react-query'
import { goalsService } from '../services/goalsService'

export function useGoal (goalId: string) {
  const { data, isFetching, isInitialLoading, isError, error } = useQuery({
    queryKey: ['goals', 'detail', goalId],
    queryFn: () => goalsService.getById(goalId)
  })

  return { goal: data, isFetching, isInitialLoading, isError, error }
}
