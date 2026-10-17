import { useQuery } from '@tanstack/react-query'
import { Category, categoriesService } from '../services/categoriesService'

export function useCategoriesSummary (month: string, type: Category['type']) {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['categories', 'summary', month, type],
    queryFn: () => categoriesService.getSummary(month, type)
  })

  return { summary: data, isFetching, isInitialLoading }
}
