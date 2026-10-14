import { useQuery } from '@tanstack/react-query'
import { debtsService } from '../services/debtsService'

export function useDebts () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['debts', 'list'],
    queryFn: debtsService.getAll
  })

  return { debts: data ?? [], isFetching, isInitialLoading }
}
