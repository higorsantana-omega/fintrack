import { useQuery } from '@tanstack/react-query'
import { wishlistService } from '../services/wishlistService'

// One query with every item; the page filters by list and status.
export function useWishlistItems () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['wishlist', 'items'],
    queryFn: wishlistService.getItems
  })

  return { items: data ?? [], isFetching, isInitialLoading }
}
