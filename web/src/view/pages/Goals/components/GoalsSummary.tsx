import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface GoalsSummaryProps {
  monthlyContribution: number
  totalSaved: number
}

export function GoalsSummary({ monthlyContribution, totalSaved }: GoalsSummaryProps) {
  return (
    <div className='bg-teal-900 rounded-2xl p-6 md:p-8 flex flex-col justify-center gap-8 text-white'>
      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Aporte mensal das metas em andamento</span>
        <strong id='summary-monthly' className='text-2xl tracking-[-1px] block'>
          {formatCurrency(monthlyContribution)}
        </strong>
      </div>

      <div>
        <span className='tracking-[-0.5px] text-teal-50 text-sm block'>Total guardado</span>
        <strong id='summary-total' className='text-2xl tracking-[-1px] block'>
          {formatCurrency(totalSaved)}
        </strong>
      </div>
    </div>
  )
}
