import { CreditCardDetail } from '../../../app/entities/CreditCard'
import { formatDate } from '../../../app/utils/formatDate'

/**
 * The invoices the bank may still charge (KTD7, KTD11): the closed one only when
 * the API says it is unpaid, then the open one.
 */
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
      /** What "Corrigir" on the review step names this invoice by. */
      correctionId: `${card.id}:${invoice.month}`
    }]
  })
}
