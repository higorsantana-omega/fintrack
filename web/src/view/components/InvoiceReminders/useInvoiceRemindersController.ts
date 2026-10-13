import { useEffect, useState } from 'react'
import { InvoiceReminder } from '../../../app/entities/CreditCard'
import { useInvoiceReminders } from '../../../app/hooks/useInvoiceReminders'
import { usePayInvoice } from '../PayInvoiceModal/usePayInvoice'

export function useInvoiceRemindersController(onDone: () => void) {
  const { reminders, isFetched } = useInvoiceReminders()
  const { openPayInvoice } = usePayInvoice()
  const [queue, setQueue] = useState<InvoiceReminder[] | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  // The queue is a snapshot of the first answer, taken when the private
  // layout mounts; later refetches only feed the banner.
  useEffect(() => {
    if (queue === null && isFetched) setQueue(reminders)
  }, [queue, isFetched, reminders])

  const currentReminder = isDismissed ? undefined : queue?.[0]
  const isDone = queue !== null && !currentReminder

  // The goal reminders wait for this queue to end (R34, R35).
  useEffect(() => {
    if (isDone) onDone()
  }, [isDone, onDone])

  function handlePayNow() {
    if (!currentReminder) return

    setIsPaying(true)
    openPayInvoice(currentReminder, {
      // Paid, even partially, the invoice leaves the queue without asking the
      // API again, so a partial payment does not bring the modal back (AE15).
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
