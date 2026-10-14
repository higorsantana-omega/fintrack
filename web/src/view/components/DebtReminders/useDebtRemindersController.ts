import { useEffect, useState } from 'react'
import { DebtReminder } from '../../../app/entities/Debt'
import { useDebtReminders } from '../../../app/hooks/useDebtReminders'
import { usePayDebt } from '../PayDebtModal/usePayDebt'

export function useDebtRemindersController(onDone: () => void) {
  const { reminders, isFetched } = useDebtReminders()
  const { openPayDebt } = usePayDebt()
  const [queue, setQueue] = useState<DebtReminder[] | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  // The queue is a snapshot of the first answer, taken when the private
  // layout mounts; later refetches only feed the banner and the menu dot.
  useEffect(() => {
    if (queue === null && isFetched) setQueue(reminders)
  }, [queue, isFetched, reminders])

  const currentReminder = isDismissed ? undefined : queue?.[0]
  const isDone = queue !== null && !currentReminder

  // The goal reminders wait for this queue to end (KTD8).
  useEffect(() => {
    if (isDone) onDone()
  }, [isDone, onDone])

  function handlePayNow() {
    if (!currentReminder) return

    setIsPaying(true)
    openPayDebt({
      debtId: currentReminder.debtId,
      debtName: currentReminder.debtName,
      initialNumbers: currentReminder.installments.map(({ number }) => number)
    }, {
      // Paid, the debt leaves the queue without asking the API again.
      onPaid: () => {
        setQueue(previous => previous?.slice(1) ?? [])
        setIsPaying(false)
      },
      onCancel: () => setIsPaying(false)
    })
  }

  function handleLater() {
    setIsDismissed(true)
  }

  return {
    currentReminder: isPaying ? undefined : currentReminder,
    handlePayNow,
    handleLater
  }
}
