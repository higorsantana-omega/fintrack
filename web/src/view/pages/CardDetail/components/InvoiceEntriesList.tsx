import { CardEntry } from '../../../../app/entities/CreditCard'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../app/utils/formatDate'
import { getCategoryName } from '../../../../app/utils/categories'
import { CategoryIcon } from '../../../components/icons/categories/CategoryIcon'

interface InvoiceEntriesListProps {
  entries: CardEntry[]
  onSelect(entry: CardEntry): void
}

function getMarks(entry: CardEntry) {
  return [
    entry.installmentsCount > 1 && `${entry.installmentNumber}/${entry.installmentsCount}`,
    entry.recurringChargeId && !entry.isForecast && 'Recorrente',
    entry.isForecast && 'Previsão',
    entry.kind === 'REFUND' && 'Estorno'
  ].filter((mark): mark is string => !!mark)
}

export function InvoiceEntriesList({ entries, onSelect }: InvoiceEntriesListProps) {
  if (entries.length === 0) {
    return <p className='text-gray-600 text-sm py-6 text-center'>Nenhum lançamento nesta fatura.</p>
  }

  return (
    <ul id='invoice-entries' className='space-y-2'>
      {entries.map(entry => (
        <li key={entry.id}>
          <button
            type='button'
            onClick={() => onSelect(entry)}
            className={cn(
              'invoice-entry w-full bg-white p-4 rounded-2xl flex items-center justify-between gap-4 text-left',
              entry.isForecast && 'opacity-70'
            )}
          >
            <div className='flex items-center gap-3 min-w-0'>
              <CategoryIcon type='expense' category={entry.category} />
              <div className='min-w-0'>
                <strong className='font-bold tracking-[-0.5px] block text-gray-800 truncate'>{entry.description}</strong>
                <span className='text-sm text-gray-600'>
                  {formatDate(new Date(entry.date))} · {entry.category ? getCategoryName(entry.category) : 'Sem categoria'}
                </span>
                <div className='flex flex-wrap gap-1 mt-1'>
                  {getMarks(entry).map(mark => (
                    <span key={mark} className='entry-mark text-[11px] font-medium rounded-full px-2 py-0.5 bg-gray-100 text-gray-700'>
                      {mark}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <span
              className={cn(
                'tracking-[-0.5px] font-medium whitespace-nowrap',
                entry.kind === 'REFUND' ? 'text-teal-900' : 'text-gray-800'
              )}
            >
              {entry.kind === 'REFUND' ? '- ' : ''}{formatCurrency(entry.value)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
