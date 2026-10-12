import { useQuery } from '@tanstack/react-query'
import { goalsService } from '../services/goalsService'

// Disabled on purpose: the reminders queue is a snapshot taken when the
// private layout mounts, so it only fetches when `refetch` is called.
export function useGoalReminders () {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['goals', 'reminders'],
    queryFn: goalsService.getReminders,
    enabled: false
  })

  return { reminders: data ?? [], isFetching, refetch }
}
