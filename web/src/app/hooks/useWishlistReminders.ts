import { useQuery } from '@tanstack/react-query'
import { wishlistService } from '../services/wishlistService'

// The API decides which items are due; the web only shows what it returns.
// The app turns refetchOnWindowFocus off, so this one turns it back on to
// check the day again when the user returns to the tab, even after midnight.
export function useWishlistReminders () {
  const { data, isFetched } = useQuery({
    queryKey: ['wishlist', 'reminders'],
    queryFn: wishlistService.getReminders,
    refetchOnWindowFocus: true
  })

  return { reminders: data ?? [], isFetched }
}
