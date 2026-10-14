import { useDebtReminders } from '../../../app/hooks/useDebtReminders'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { Button } from '../Button'
import { usePayDebt } from '../PayDebtModal/usePayDebt'

// While any debt is in reminder, the installment due first stays on top of
// every logged page, right below the invoice banner (R23).
export function DebtReminderBanner() {
  const { reminders } = useDebtReminders()
  const { openPayDebt } = usePayDebt()

  if (reminders.length === 0) return null

  const [nextReminder, ...others] = reminders
  const [nextInstallment] = nextReminder.installments

  return (
    <div
      id='debt-reminder-banner'
      role='status'
      className='bg-red-50 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3'
    >
      <p className='text-sm text-gray-800 tracking-[-0.5px]'>
        Parcela {nextInstallment.number} de <strong>{nextReminder.debtName}</strong>, com vencimento em{' '}
        {formatDate(new Date(nextInstallment.dueDate))}:{' '}
        <strong id='debt-reminder-banner-value'>{formatCurrency(nextInstallment.expectedValue)}</strong> a pagar
        {others.length > 0 && <span id='debt-reminder-banner-others'> e mais {others.length}</span>}
      </p>

      <Button
        id='debt-reminder-banner-pay'
        className='h-10 shrink-0'
        onClick={() => openPayDebt({
          debtId: nextReminder.debtId,
          debtName: nextReminder.debtName,
          initialNumbers: nextReminder.installments.map(({ number }) => number)
        })}
      >
        Pagar
      </Button>
    </div>
  )
}
