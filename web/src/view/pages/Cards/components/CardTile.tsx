import { Link } from 'react-router-dom'
import { CreditCard } from '../../../../app/entities/CreditCard'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../app/utils/formatDate'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { INVOICE_STATUS_LABELS } from '../../../constants/CardConstants'

interface CardTileProps {
  card: CreditCard
}

export function CardTile({ card }: CardTileProps) {
  const isArchived = !!card.archivedAt
  const { currentInvoice } = card

  return (
    <Link
      to={`/cartoes/${card.id}`}
      data-card-name={card.name}
      className={cn(
        'bg-white rounded-2xl p-4 flex flex-col gap-3 border-b-4 hover:shadow-[0px_11px_20px_0px_rgba(0,0,0,0.06)] transition-shadow',
        isArchived && 'opacity-80'
      )}
      style={{ borderColor: card.color }}
    >
      <div className='flex items-start justify-between gap-2'>
        <strong className='text-gray-800 tracking-[-0.5px] font-medium'>{card.name}</strong>

        {isArchived && card.owed > 0 && (
          <span className='card-owed text-xs font-medium rounded-full px-2 py-1 whitespace-nowrap bg-red-50 text-red-900'>
            deve {formatCurrency(card.owed)}
          </span>
        )}
      </div>

      <div className='text-sm tracking-[-0.5px] text-gray-600'>
        Fatura de {formatMonth(currentInvoice.month)}:{' '}
        <strong className='card-invoice text-gray-800'>{formatCurrency(currentInvoice.total)}</strong>
        {' · '}{INVOICE_STATUS_LABELS[currentInvoice.status]}
        <span className='block'>Vence em {formatDate(new Date(currentInvoice.dueDate))}</span>
      </div>

      {!isArchived && (
        <div className='text-sm tracking-[-0.5px] text-gray-600'>
          Disponível:{' '}
          <strong className={cn('card-available', card.limit.available < 0 ? 'text-red-900' : 'text-teal-900')}>
            {formatCurrency(card.limit.available)}
          </strong>
          <span> de {formatCurrency(card.limit.total)}</span>
        </div>
      )}
    </Link>
  )
}
