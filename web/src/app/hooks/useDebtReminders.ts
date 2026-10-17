import { useQuery } from '@tanstack/react-query'
import { debtsService } from '../services/debtsService'

// A regular query: the banner and the menu dot follow it as payments change.
// The app turns refetchOnWindowFocus off, so this one turns it back on to
// check the day again when the user returns to the tab, even after midnight.
export function useDebtReminders () {
  const { data, isFetched } = useQuery({
    queryKey: ['debts', 'reminders'],
    queryFn: debtsService.getReminders,
    refetchOnWindowFocus: true
  })

  return { reminders: data ?? [], isFetched }
}
