import { DebtDetail, DebtInstallment } from '../../../../app/entities/Debt'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../app/utils/formatDate'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { isOpenInstallment } from '../../../../app/utils/debtInstallments'
import { INSTALLMENT_STATE_LABELS } from '../../../constants/DebtConstants'

interface InstallmentsListProps {
  installmentsCount: number
  years: {
    year: string
    installments: DebtDetail['installments']
    openCount: number
    isExpanded: boolean
  }[]
  onToggleYear(year: string, isExpanded: boolean): void
  onAdjust(installment: DebtInstallment): void
}

export function InstallmentsList({ installmentsCount, years, onToggleYear, onAdjust }: InstallmentsListProps) {
  return (
    <div className='space-y-2'>
      {years.map(({ year, installments, openCount, isExpanded }) => (
        <div key={year} className='rounded-2xl bg-white'>
          <button
            id={`debt-year-${year}`}
            type='button'
            aria-expanded={isExpanded}
            className='w-full px-4 h-12 flex items-center justify-between text-sm font-medium text-gray-800 tracking-[-0.5px]'
            onClick={() => onToggleYear(year, isExpanded)}
          >
            <span>{year}</span>
            <span className='text-gray-600 font-normal'>
              {openCount > 0 ? `${openCount} em aberto` : 'Sem parcelas em aberto'}
            </span>
          </button>

          {isExpanded && installments.map(installment => (
            <InstallmentRow
              key={installment.number}
              installment={installment}
              installmentsCount={installmentsCount}
              onAdjust={onAdjust}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface InstallmentRowProps {
  installment: DebtInstallment
  installmentsCount: number
  onAdjust(installment: DebtInstallment): void
}

function InstallmentRow({ installment, installmentsCount, onAdjust }: InstallmentRowProps) {
  const { number, state, payment } = installment
  const isOpen = isOpenInstallment(installment)

  return (
    <div
      id={`debt-installment-${number}`}
      data-state={state}
      className='px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm tracking-[-0.5px]'
    >
      <div>
        <strong className='text-gray-800'>Parcela {number}/{installmentsCount}</strong>
        <span className='block text-xs text-gray-600'>
          {formatMonth(installment.month)} · vence em {formatDate(new Date(installment.dueDate))}
        </span>
      </div>

      <div className='text-right'>
        <span className='debt-installment-expected text-gray-800'>{formatCurrency(installment.expectedValue)}</span>
        <span
          className={cn(
            'debt-installment-state block text-xs text-gray-600',
            state === 'OVERDUE' && 'text-red-900 font-medium',
            state === 'PAID' && 'text-teal-900'
          )}
        >
          {state === 'PAID_BEFORE_APP' ? 'antes do app' : INSTALLMENT_STATE_LABELS[state]}
        </span>
      </div>

      {payment && (
        <div className='debt-installment-payment basis-full text-xs text-gray-600 flex flex-wrap items-center gap-x-3'>
          <span>Pago: <strong className='debt-installment-paid-value text-gray-800'>{formatCurrency(payment.value)}</strong></span>
          <span>{formatDate(new Date(payment.date))}</span>
          <span className='flex items-center gap-1'>
            <span className='w-2 h-2 rounded-full' style={{ background: payment.bankAccount.color }} />
            {payment.bankAccount.name}
          </span>
        </div>
      )}

      {isOpen && (
        <button
          id={`debt-installment-adjust-${number}`}
          type='button'
          className='basis-full text-left text-xs font-medium text-teal-900 hover:underline w-fit'
          onClick={() => onAdjust(installment)}
        >
          Ajustar valor daqui em diante
        </button>
      )}
    </div>
  )
}
