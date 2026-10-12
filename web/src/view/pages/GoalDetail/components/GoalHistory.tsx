import { GoalHistoryItem } from '../../../../app/entities/Goal'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../app/utils/formatDate'
import { formatMonth } from '../../../../app/utils/formatMonth'

interface GoalHistoryProps {
  items: GoalHistoryItem[]
}

const KIND_LABELS: Record<GoalHistoryItem['kind'], string> = {
  CONTRIBUTION: 'Aporte',
  WITHDRAWAL: 'Resgate',
  SKIPPED: 'Não aportei'
}

export function GoalHistory({ items }: GoalHistoryProps) {
  return (
    <div className='bg-gray-100 rounded-2xl p-6 md:p-8 flex flex-col gap-4'>
      <strong className='text-gray-800 tracking-[-1px] text-lg'>Histórico</strong>

      {items.length === 0 && (
        <p className='text-gray-600 text-sm py-6 text-center'>Nenhum aporte registrado ainda.</p>
      )}

      {items.length > 0 && (
        <ul id='goal-history' className='space-y-2'>
          {items.map(item => (
            <li key={item.id} className='bg-white p-4 rounded-2xl flex items-center justify-between gap-4'>
              <div>
                <strong className='font-bold tracking-[-0.5px] block text-gray-800'>{KIND_LABELS[item.kind]}</strong>
                <span className='text-sm text-gray-600'>
                  {item.kind === 'SKIPPED'
                    ? formatMonth(item.date.slice(0, 7))
                    : `${formatDate(new Date(item.date))}${item.bankAccount ? ` · ${item.bankAccount.name}` : ''}`}
                </span>
              </div>

              {item.value !== null && (
                <span
                  className={cn(
                    'tracking-[-0.5px] font-medium whitespace-nowrap',
                    item.kind === 'CONTRIBUTION' ? 'text-teal-900' : 'text-gray-700'
                  )}
                >
                  {item.kind === 'CONTRIBUTION' ? '+' : '-'} {formatCurrency(item.value)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
