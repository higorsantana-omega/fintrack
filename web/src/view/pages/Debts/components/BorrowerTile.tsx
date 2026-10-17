import { Link } from 'react-router-dom'
import { Borrower } from '../../../../app/entities/Borrower'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface BorrowerTileProps {
  borrower: Borrower
}

export function BorrowerTile({ borrower }: BorrowerTileProps) {
  const isSettled = borrower.balance <= 0

  return (
    <Link
      to={`/dividas/pessoas/${borrower.id}`}
      data-borrower-name={borrower.name}
      className={cn(
        'borrower-card bg-white rounded-2xl p-4 flex flex-col gap-2 border-b-4 border-teal-900 hover:shadow-[0px_11px_20px_0px_rgba(0,0,0,0.06)] transition-shadow',
        isSettled && 'border-gray-400 opacity-80'
      )}
    >
      <strong className='text-gray-800 tracking-[-0.5px] font-medium'>{borrower.name}</strong>

      {!isSettled && (
        <div className='text-sm tracking-[-0.5px] text-gray-600'>
          Deve: <strong className='borrower-balance text-gray-800'>{formatCurrency(borrower.balance)}</strong>
        </div>
      )}

      {isSettled && (
        <div className='text-sm tracking-[-0.5px] text-gray-600'>
          <strong className='borrower-balance text-gray-800'>Em dia</strong>
          {borrower.overpaid > 0 && (
            <span className='borrower-overpaid block'>
              Devolveu {formatCurrency(borrower.overpaid)} a mais
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
