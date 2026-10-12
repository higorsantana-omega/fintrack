import { useQuery } from '@tanstack/react-query'
import { goalsService } from '../services/goalsService'

export function useGoals () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['goals', 'list'],
    queryFn: goalsService.getAll
  })

  return { goals: data ?? [], isFetching, isInitialLoading }
}
