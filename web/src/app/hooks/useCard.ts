import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../services/cardsService'

export function useCard (cardId: string) {
  const { data, isFetching, isInitialLoading, isError, error } = useQuery({
    queryKey: ['cards', 'detail', cardId],
    queryFn: () => cardsService.getById(cardId)
  })

  return { card: data, isFetching, isInitialLoading, isError, error }
}
