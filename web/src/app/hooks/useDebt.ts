import { useQuery } from '@tanstack/react-query'
import { debtsService } from '../services/debtsService'

export function useDebt (debtId: string) {
  const { data, isFetching, isInitialLoading, isError, error } = useQuery({
    queryKey: ['debts', 'detail', debtId],
    queryFn: () => debtsService.getById(debtId)
  })

  return { debt: data, isFetching, isInitialLoading, isError, error }
}
