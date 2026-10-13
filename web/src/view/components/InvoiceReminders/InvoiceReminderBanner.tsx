import { useInvoiceReminders } from '../../../app/hooks/useInvoiceReminders'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { formatMonth } from '../../../app/utils/formatMonth'
import { Button } from '../Button'
import { usePayInvoice } from '../PayInvoiceModal/usePayInvoice'

// While any invoice is in reminder, the one due first stays on top of every
// logged page (R36).
export function InvoiceReminderBanner() {
  const { reminders } = useInvoiceReminders()
  const { openPayInvoice } = usePayInvoice()

  if (reminders.length === 0) return null

  const [nextReminder, ...others] = reminders
  const isOverdue = nextReminder.status === 'OVERDUE'

  return (
    <div
      id='invoice-reminder-banner'
      role='status'
      className='bg-red-50 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3'
    >
      <p className='text-sm text-gray-800 tracking-[-0.5px]'>
        Fatura <strong>{nextReminder.cardName} {formatMonth(nextReminder.month)}</strong>
        {isOverdue ? ' venceu em ' : ' vence em '}
        {formatDate(new Date(nextReminder.dueDate))}:{' '}
        <strong id='invoice-reminder-banner-balance'>{formatCurrency(nextReminder.balance)}</strong> a pagar
        {others.length > 0 && <span id='invoice-reminder-banner-others'> e mais {others.length}</span>}
      </p>

      <Button
        id='invoice-reminder-banner-pay'
        className='h-10 shrink-0'
        onClick={() => openPayInvoice(nextReminder)}
      >
        Pagar
      </Button>
    </div>
  )
}
