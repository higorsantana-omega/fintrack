export type InvoiceStatus = 'FUTURE' | 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE'

export type CardEntryKind = 'PURCHASE' | 'REFUND'

export interface CardCategory {
  id: string
  name: string
  icon: string
}

export interface CardLimit {
  total: number
  used: number
  available: number
}

export interface CreditCard {
  id: string
  name: string
  color: string
  archivedAt: string | null
  createdAt: string
  closingDay: number
  dueDay: number
  limit: CardLimit
  owed: number
  currentInvoice: {
    month: string
    total: number
    balance: number
    dueDate: string
    status: InvoiceStatus
  }
  /** Invoices offered for the current installment of a purchase in progress. */
  openInvoiceMonth: string
  lastClosedInvoiceMonth: string
  /** Earliest first charge date of a new recurring charge. */
  earliestChargeDate: string
}

export interface CardEntry {
  id: string
  purchaseId: string | null
  kind: CardEntryKind
  description: string
  date: string
  category: CardCategory | null
  value: number
  installmentNumber: number
  installmentsCount: number
  totalValue: number
  currentInstallment: number
  anchorInvoiceMonth: string | null
  recurringChargeId: string | null
  isForecast: boolean
}

export interface CardInvoice {
  month: string
  closingDate: string
  dueDate: string
  periodStart: string
  total: number
  balance: number
  paid: number
  creditIn: number
  creditOut: number
  forecast: number
  /** Height of the strip block: the total floored at zero plus forecasts. */
  value: number
  status: InvoiceStatus
  isFuture: boolean
  canPay: boolean
  entries: CardEntry[]
  categories: {
    category: CardCategory | null
    total: number
    share: number
  }[]
  payments: {
    id: string
    name: string
    value: number
    date: string
    bankAccount: { id: string, name: string, color: string }
  }[]
}

export interface RecurringCharge {
  id: string
  description: string
  value: number
  category: CardCategory | null
  firstChargeDate: string
}

export interface CreditCardDetail extends CreditCard {
  invoices: CardInvoice[]
  selectedMonth: string
  recurringCharges: RecurringCharge[]
  lastPaymentBankAccountId: string | null
}

export interface CardsSummary {
  invoicesTotal: number
  limit: CardLimit
  invoicesByMonth: {
    month: string
    total: number
    forecast: number
    credit: number
    value: number
    isFuture: boolean
  }[]
}

export interface InvoiceReminder {
  cardId: string
  cardName: string
  cardColor: string
  month: string
  balance: number
  dueDate: string
  status: InvoiceStatus
  lastPaymentBankAccountId: string | null
}
