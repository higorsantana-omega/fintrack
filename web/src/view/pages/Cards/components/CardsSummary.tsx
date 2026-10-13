import { CardLimit } from '../../../../app/entities/CreditCard'
import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface CardsSummaryProps {
  invoicesTotal: number
  limit: CardLimit
}

export function CardsSummary({ invoicesTotal, limit }: CardsSummaryProps) {
  return (
    <div className='bg-teal-900 rounded-2xl p-6 md:p-8 flex flex-col justify-center gap-8 text-white'>
      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Faturas que vencem este mês</span>
        <strong id='summary-invoices' className='text-2xl tracking-[-1px] block'>
          {formatCurrency(invoicesTotal)}
        </strong>
      </div>

      <div className='space-y-2'>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Limite dos cartões</span>
        <div className='grid grid-cols-3 gap-2 text-sm'>
          <div>
            <span className='text-teal-50 block'>Total</span>
            <strong id='summary-limit-total'>{formatCurrency(limit.total)}</strong>
          </div>
          <div>
            <span className='text-teal-50 block'>Usado</span>
            <strong id='summary-limit-used'>{formatCurrency(limit.used)}</strong>
          </div>
          <div>
            <span className='text-teal-50 block'>Disponível</span>
            <strong id='summary-limit-available'>{formatCurrency(limit.available)}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
