import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { useDebtRemindersController } from './useDebtRemindersController'

interface DebtRemindersProps {
  /** Holds the debt reminders while the invoice reminders run (R22). */
  isHeld?: boolean
  onDone(): void
}

export function DebtReminders({ isHeld = false, onDone }: DebtRemindersProps) {
  const { currentReminder, handlePayNow, handleLater } = useDebtRemindersController(onDone)

  if (isHeld || !currentReminder) return null

  const installmentsCount = currentReminder.installments.length

  return (
    <Modal
      key={currentReminder.debtId}
      title='Lembrete de dívida'
      open
      onClose={handleLater}
    >
      <div className='space-y-1'>
        <span className='text-gray-600 tracking-[-0.5px] text-sm block'>Dívida</span>
        <strong id='debt-reminder-name' className='text-gray-800 tracking-[-0.5px] text-lg block'>
          {currentReminder.debtName}
        </strong>
        <div className='flex flex-wrap gap-x-4 text-sm text-gray-700 tracking-[-0.5px]'>
          <span>
            Vencimento: <strong id='debt-reminder-due'>{formatDate(new Date(currentReminder.dueDate))}</strong>
          </span>
          <span id='debt-reminder-count'>
            {installmentsCount === 1 ? '1 parcela' : `${installmentsCount} parcelas`}
          </span>
        </div>
      </div>

      <div>
        <span className='text-gray-600 tracking-[-0.5px] text-xs block'>Valor previsto</span>
        <strong id='debt-reminder-value' className='text-gray-800 text-[32px] tracking-[-1px]'>
          {formatCurrency(currentReminder.expectedValue)}
        </strong>
      </div>

      <div className='space-y-4'>
        <Button id='debt-reminder-pay' className='w-full' onClick={handlePayNow}>
          Pagar agora
        </Button>
        <Button id='debt-reminder-later' className='w-full' ghost onClick={handleLater}>
          Depois
        </Button>
      </div>
    </Modal>
  )
}
