import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../services/cardsService'

export function useCardsSummary () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['cards', 'summary'],
    queryFn: cardsService.getSummary
  })

  return { summary: data, isFetching, isInitialLoading }
}
