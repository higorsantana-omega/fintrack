import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../services/cardsService'

export function useCards () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['cards', 'list'],
    queryFn: cardsService.getAll
  })

  return { cards: data ?? [], isFetching, isInitialLoading }
}
