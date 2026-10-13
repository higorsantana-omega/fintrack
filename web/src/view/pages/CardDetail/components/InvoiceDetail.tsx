import { CardInvoice } from '../../../../app/entities/CreditCard'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../app/utils/formatDate'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { Button } from '../../../components/Button'
import { INVOICE_STATUS_LABELS } from '../../../constants/CardConstants'

interface InvoiceDetailProps {
  invoice: CardInvoice
  onPay(): void
}

export function InvoiceDetail({ invoice, onPay }: InvoiceDetailProps) {
  return (
    <div id='invoice-detail' className='bg-white rounded-2xl p-4 md:p-6 flex flex-col gap-4'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <strong className='text-gray-800 tracking-[-1px] text-lg'>Fatura {formatMonth(invoice.month)}</strong>
          <span
            id='invoice-status'
            className={cn(
              'text-xs font-medium rounded-full px-2 py-1',
              invoice.status === 'OVERDUE' ? 'bg-red-50 text-red-900' : 'bg-gray-100 text-gray-700'
            )}
          >
            {INVOICE_STATUS_LABELS[invoice.status]}
          </span>
        </div>

        {invoice.canPay && (
          <Button id='invoice-pay' className='h-10' onClick={onPay}>Pagar</Button>
        )}
      </header>

      <dl className='grid grid-cols-2 md:grid-cols-5 gap-4 text-sm'>
        <div>
          <dt className='text-gray-600'>Total</dt>
          <dd id='invoice-total' className='text-gray-800 font-medium'>{formatCurrency(invoice.total)}</dd>
        </div>
        <div>
          <dt className='text-gray-600'>Saldo a pagar</dt>
          <dd id='invoice-balance' className='text-gray-800 font-medium'>{formatCurrency(Math.max(0, invoice.balance))}</dd>
        </div>
        <div>
          <dt className='text-gray-600'>Pago</dt>
          <dd id='invoice-paid' className='text-gray-800 font-medium'>{formatCurrency(invoice.paid)}</dd>
        </div>
        <div>
          <dt className='text-gray-600'>Fechamento</dt>
          <dd className='text-gray-800 font-medium'>{formatDate(new Date(invoice.closingDate))}</dd>
        </div>
        <div>
          <dt className='text-gray-600'>Vencimento</dt>
          <dd className='text-gray-800 font-medium'>{formatDate(new Date(invoice.dueDate))}</dd>
        </div>
      </dl>

      {(invoice.creditIn > 0 || invoice.creditOut > 0 || invoice.forecast > 0) && (
        <ul className='text-sm text-gray-700 space-y-1'>
          {invoice.creditIn > 0 && <li>Crédito da fatura anterior: {formatCurrency(invoice.creditIn)}</li>}
          {invoice.creditOut > 0 && <li>Crédito para a próxima fatura: {formatCurrency(invoice.creditOut)}</li>}
          {invoice.forecast > 0 && <li>Previsões de recorrentes, fora do total: {formatCurrency(invoice.forecast)}</li>}
        </ul>
      )}

      {invoice.payments.length > 0 && (
        <div className='space-y-2'>
          <strong className='text-gray-800 tracking-[-0.5px] text-sm block'>Pagamentos</strong>
          <ul id='invoice-payments' className='space-y-1 text-sm'>
            {invoice.payments.map(payment => (
              <li key={payment.id} className='flex justify-between gap-4 text-gray-700'>
                <span>{formatDate(new Date(payment.date))} · {payment.bankAccount.name}</span>
                <span className='font-medium text-gray-800'>{formatCurrency(payment.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
