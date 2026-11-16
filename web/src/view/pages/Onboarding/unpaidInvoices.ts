import { CreditCardDetail } from '../../../app/entities/CreditCard'
import { formatDate } from '../../../app/utils/formatDate'

export function getUnpaidInvoices(card: CreditCardDetail) {
  return [
    { month: card.unpaidClosedInvoiceMonth, isClosed: true },
    { month: card.openInvoiceMonth, isClosed: false }
  ].flatMap(({ month, isClosed }) => {
    const invoice = card.invoices.find(item => item.month === month)
    if (!invoice) return []

    const dueDay = formatDate(new Date(invoice.dueDate)).slice(0, 5)

    return [{
      invoice,
      isClosed,
      label: `${isClosed ? 'Fatura fechada' : 'Fatura aberta'} · vence ${dueDay}`,
      correctionId: `${card.id}:${invoice.month}`
    }]
  })
}
