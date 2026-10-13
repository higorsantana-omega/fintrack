import { useEffect, useRef } from 'react'
import { CardInvoice } from '../../../../app/entities/CreditCard'
import { cn } from '../../../../app/utils/cn'
import { formatCompactCurrency } from '../../../../app/utils/formatCompactCurrency'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { INVOICE_STATUS_LABELS } from '../../../constants/CardConstants'

// Blocks of zero or credit keep a clickable height (KTD12).
const MIN_HEIGHT = 12
const MAX_HEIGHT = 120

interface InvoiceStripProps {
  invoices: CardInvoice[]
  selectedMonth: string
  onSelect(month: string): void
}

export function InvoiceStrip({ invoices, selectedMonth, onSelect }: InvoiceStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)
  const highest = Math.max(0, ...invoices.map(invoice => invoice.value))

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [])

  return (
    <div id='invoice-strip' role='group' aria-label='Faturas' className='flex gap-2 overflow-x-auto pb-2'>
      {invoices.map(invoice => {
        const isSelected = invoice.month === selectedMonth
        const height = highest > 0
          ? MIN_HEIGHT + (invoice.value / highest) * (MAX_HEIGHT - MIN_HEIGHT)
          : MIN_HEIGHT

        return (
          <button
            key={invoice.month}
            ref={isSelected ? selectedRef : undefined}
            type='button'
            data-month={invoice.month}
            aria-pressed={isSelected}
            onClick={() => onSelect(invoice.month)}
            className={cn(
              'shrink-0 w-[72px] rounded-xl p-2 flex flex-col items-center justify-end gap-1 transition-colors hover:bg-gray-50',
              isSelected && 'bg-teal-50 hover:bg-teal-50'
            )}
          >
            <span className='text-[11px] text-gray-700 tracking-[-0.5px] whitespace-nowrap'>
              {formatCompactCurrency(invoice.value)}
            </span>
            <span
              className={cn(
                'w-full rounded-lg',
                invoice.isFuture ? 'bg-teal-200' : 'bg-teal-900',
                invoice.status === 'OVERDUE' && 'bg-red-900'
              )}
              style={{ height }}
            />
            <span className='text-xs font-medium text-gray-800'>{formatMonth(invoice.month, true)}</span>
            <span className='text-[11px] text-gray-600'>{INVOICE_STATUS_LABELS[invoice.status]}</span>
          </button>
        )
      })}
    </div>
  )
}
