import { useQuery } from '@tanstack/react-query'
import { cardsService } from '../services/cardsService'

// A regular query: the banner and the menu dot follow it as payments and
// entries change. The reminder modals keep their own snapshot of it.
export function useInvoiceReminders () {
  const { data, isFetched } = useQuery({
    queryKey: ['cards', 'reminders'],
    queryFn: cardsService.getReminders
  })

  return { reminders: data ?? [], isFetched }
}
