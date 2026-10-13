import { InvoiceStatus } from '../../app/entities/CreditCard'

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  FUTURE: 'Futura',
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  PAID: 'Paga',
  OVERDUE: 'Vencida'
}
