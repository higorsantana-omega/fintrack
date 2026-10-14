import { useQuery } from '@tanstack/react-query'
import { borrowersService } from '../services/borrowersService'

export function useBorrowers () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['debts', 'borrowers'],
    queryFn: borrowersService.getAll
  })

  return { borrowers: data ?? [], isFetching, isInitialLoading }
}
