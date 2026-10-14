import { DebtsSummary as DebtsSummaryData } from '../../../../app/entities/Debt'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatMonth } from '../../../../app/utils/formatMonth'

interface DebtsSummaryProps {
  summary: DebtsSummaryData
}

export function DebtsSummary({ summary }: DebtsSummaryProps) {
  return (
    <div className='bg-teal-900 rounded-2xl p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 text-white'>
      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Total que eu devo</span>
        <strong id='summary-total-owed' className='text-2xl tracking-[-1px] block'>
          {formatCurrency(summary.totalOwed)}
        </strong>
      </div>

      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>A pagar no mês (com atrasadas)</span>
        <strong id='summary-due-this-month' className='text-2xl tracking-[-1px] block'>
          {formatCurrency(summary.dueThisMonth)}
        </strong>
      </div>

      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Termina em</span>
        <strong id='summary-ends-in' className='text-2xl tracking-[-1px] block'>
          {summary.endsIn ? formatMonth(summary.endsIn) : '—'}
        </strong>
      </div>

      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Me devem</span>
        <strong id='summary-owed-by-people' className='text-2xl tracking-[-1px] block'>
          {formatCurrency(summary.owedByPeople)}
        </strong>
      </div>
    </div>
  )
}
