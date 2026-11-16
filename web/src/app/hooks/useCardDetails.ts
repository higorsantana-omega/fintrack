import { useQueries } from '@tanstack/react-query'
import { CreditCardDetail } from '../entities/CreditCard'
import { cardsService } from '../services/cardsService'

/** The detail of each card, under the same query as `useCard`. */
export function useCardDetails (cardIds: string[]) {
  const results = useQueries({
    queries: cardIds.map(cardId => ({
      queryKey: ['cards', 'detail', cardId],
      queryFn: () => cardsService.getById(cardId)
    }))
  })

  return {
    cards: results.flatMap(({ data }): CreditCardDetail[] => data ? [data] : []),
    isInitialLoading: results.some(({ isInitialLoading }) => isInitialLoading)
  }
}
