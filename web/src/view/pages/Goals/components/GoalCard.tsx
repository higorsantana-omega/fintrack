import { Link } from 'react-router-dom'
import { Goal } from '../../../../app/entities/Goal'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface GoalCardProps {
  goal: Goal
}

export function GoalCard({ goal }: GoalCardProps) {
  const progress = Math.min(100, Math.round((goal.totalSaved / goal.targetAmount) * 100))

  return (
    <Link
      to={`/metas/${goal.id}`}
      className='bg-white rounded-2xl p-4 flex flex-col gap-3 border-b-4 hover:shadow-[0px_11px_20px_0px_rgba(0,0,0,0.06)] transition-shadow'
      style={{ borderColor: goal.bankAccount?.color ?? '#ADB5BD' }}
    >
      <div className='flex items-start justify-between gap-2'>
        <strong className='text-gray-800 tracking-[-0.5px] font-medium'>{goal.name}</strong>

        {goal.status === 'COMPLETED' && (
          <span
            className={cn(
              'text-xs font-medium rounded-full px-2 py-1 whitespace-nowrap',
              goal.targetReached ? 'bg-teal-50 text-teal-900' : 'bg-gray-100 text-gray-700'
            )}
          >
            {goal.targetReached ? 'Meta atingida' : 'Terminou abaixo do alvo'}
          </span>
        )}
      </div>

      <div className='text-sm tracking-[-0.5px]'>
        <strong className='text-gray-800'>{formatCurrency(goal.totalSaved)}</strong>
        <span className='text-gray-600'> de {formatCurrency(goal.targetAmount)}</span>
      </div>

      <div className='flex items-center gap-2'>
        <div
          className='flex-1 h-2 rounded-full bg-gray-100 overflow-hidden'
          role='progressbar'
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className='h-full rounded-full bg-teal-900' style={{ width: `${progress}%` }} />
        </div>
        <span className='text-xs text-gray-600 w-9 text-right'>{progress}%</span>
      </div>
    </Link>
  )
}
