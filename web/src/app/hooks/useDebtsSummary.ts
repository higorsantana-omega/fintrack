import { useQuery } from '@tanstack/react-query'
import { debtsService } from '../services/debtsService'

export function useDebtsSummary () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['debts', 'summary'],
    queryFn: debtsService.getSummary
  })

  return { summary: data, isFetching, isInitialLoading }
}
