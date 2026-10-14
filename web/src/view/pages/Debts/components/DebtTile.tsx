import { Link } from 'react-router-dom'
import { Debt } from '../../../../app/entities/Debt'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../app/utils/formatDate'
import { DEBT_STATUS_LABELS } from '../../../constants/DebtConstants'

interface DebtTileProps {
  debt: Debt
}

export function DebtTile({ debt }: DebtTileProps) {
  const { nextInstallment } = debt

  return (
    <Link
      to={`/dividas/${debt.id}`}
      data-debt-name={debt.name}
      className={cn(
        'debt-card bg-white rounded-2xl p-4 flex flex-col gap-3 border-b-4 border-teal-900 hover:shadow-[0px_11px_20px_0px_rgba(0,0,0,0.06)] transition-shadow',
        debt.status === 'OVERDUE' && 'border-red-900',
        debt.status === 'PAID' && 'border-gray-400 opacity-80'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <strong className='text-gray-800 tracking-[-0.5px] font-medium'>{debt.name}</strong>

        <span
          className={cn(
            'debt-status text-xs font-medium rounded-full px-2 py-1 whitespace-nowrap bg-teal-50 text-teal-900',
            debt.status === 'OVERDUE' && 'bg-red-50 text-red-900',
            debt.status === 'PAID' && 'bg-gray-100 text-gray-700'
          )}
        >
          {DEBT_STATUS_LABELS[debt.status]}
        </span>
      </div>

      <div className='text-sm tracking-[-0.5px] text-gray-600'>
        Parcelas pagas: <strong className='debt-paid text-gray-800'>{debt.paidCount}/{debt.installmentsCount}</strong>
        <span className='block'>
          Falta: <strong className='debt-remaining text-gray-800'>{formatCurrency(debt.remaining)}</strong>
        </span>
      </div>

      {nextInstallment && (
        <div className='debt-next text-sm tracking-[-0.5px] text-gray-600'>
          Próxima: parcela {nextInstallment.number} de {formatCurrency(nextInstallment.expectedValue)}
          <span className='block'>Vence em {formatDate(new Date(nextInstallment.dueDate))}</span>
        </div>
      )}
    </Link>
  )
}
