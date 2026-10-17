import { useQuery } from '@tanstack/react-query'
import { borrowersService } from '../services/borrowersService'

export function useBorrower (borrowerId: string) {
  const { data, isFetching, isInitialLoading, isError, error } = useQuery({
    queryKey: ['debts', 'borrower', borrowerId],
    queryFn: () => borrowersService.getById(borrowerId)
  })

  return { borrower: data, isFetching, isInitialLoading, isError, error }
}
