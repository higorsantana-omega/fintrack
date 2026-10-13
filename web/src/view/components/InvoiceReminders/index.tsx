import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { formatMonth } from '../../../app/utils/formatMonth'
import { INVOICE_STATUS_LABELS } from '../../constants/CardConstants'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { useInvoiceRemindersController } from './useInvoiceRemindersController'

interface InvoiceRemindersProps {
  onDone(): void
}

export function InvoiceReminders({ onDone }: InvoiceRemindersProps) {
  const { currentReminder, handlePayNow, handleLater } = useInvoiceRemindersController(onDone)

  if (!currentReminder) return null

  return (
    <Modal
      key={`${currentReminder.cardId}-${currentReminder.month}`}
      title='Lembrete de fatura'
      open
      onClose={handleLater}
    >
      <div className='space-y-1'>
        <span className='text-gray-600 tracking-[-0.5px] text-sm block'>Cartão</span>
        <strong id='invoice-reminder-card' className='text-gray-800 tracking-[-0.5px] text-lg block'>
          {currentReminder.cardName}
        </strong>
        <div className='flex flex-wrap gap-x-4 text-sm text-gray-700 tracking-[-0.5px]'>
          <span>
            Fatura: <strong id='invoice-reminder-month'>{formatMonth(currentReminder.month)}</strong>
          </span>
          <span>
            {INVOICE_STATUS_LABELS[currentReminder.status]} · vence em {formatDate(new Date(currentReminder.dueDate))}
          </span>
        </div>
      </div>

      <div>
        <span className='text-gray-600 tracking-[-0.5px] text-xs block'>Saldo a pagar</span>
        <strong id='invoice-reminder-balance' className='text-gray-800 text-[32px] tracking-[-1px]'>
          {formatCurrency(currentReminder.balance)}
        </strong>
      </div>

      <div className='space-y-4'>
        <Button id='invoice-reminder-pay' className='w-full' onClick={handlePayNow}>
          Pagar agora
        </Button>
        <Button id='invoice-reminder-later' className='w-full' ghost onClick={handleLater}>
          Depois
        </Button>
      </div>
    </Modal>
  )
}
