import { useQuery } from '@tanstack/react-query'
import { wishlistService } from '../services/wishlistService'

export function useWishlistLists () {
  const { data, isFetching, isInitialLoading } = useQuery({
    queryKey: ['wishlist', 'lists'],
    queryFn: wishlistService.getLists
  })

  return { lists: data ?? [], isFetching, isInitialLoading }
}
