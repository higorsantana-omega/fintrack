import { InvoiceStatus } from '../../app/entities/CreditCard'

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  FUTURE: 'Futura',
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  PAID: 'Paga',
  OVERDUE: 'Vencida'
}

export const CARD_CHART_COLORS = {
  invoice: '#087F5B',
  future: '#96F2D7',
  grid: '#DEE2E6',
  tick: '#868E96'
}
