export type DebtStatus = 'IN_PROGRESS' | 'OVERDUE' | 'PAID'

export type InstallmentState = 'PAID_BEFORE_APP' | 'PAID' | 'OPEN' | 'OVERDUE'

export interface DebtNextInstallment {
  number: number
  month: string
  dueDate: string
  expectedValue: number
}

export interface Debt {
  id: string
  name: string
  dueDay: number
  createdAt: string
  installmentsCount: number
  paidCount: number
  remaining: number
  /** Month (YYYY-MM) of the last open installment. */
  endsIn: string | null
  status: DebtStatus
  nextInstallment: DebtNextInstallment | null
}

export interface DebtInstallment {
  number: number
  month: string
  dueDate: string
  expectedValue: number
  state: InstallmentState
  payment: {
    transactionId: string
    value: number
    date: string
    bankAccount: { id: string, name: string, color: string }
  } | null
}

export interface DebtDetail extends Debt {
  hasPayment: boolean
  /** What the debt was registered with, to prefill the edit form. */
  registration: {
    installmentsCount: number
    nextInstallment: number
    nextInstallmentMonth: string
  }
  installments: DebtInstallment[]
  shortcuts: {
    currentMonth: number[]
    overdueAndCurrentMonth: number[]
  }
  reminderNumbers: number[]
  lastPaymentBankAccountId: string | null
}

export interface DebtsSummary {
  totalOwed: number
  dueThisMonth: number
  endsIn: string | null
  owedByPeople: number
}

export interface DebtReminder {
  debtId: string
  debtName: string
  dueDate: string
  expectedValue: number
  installments: DebtNextInstallment[]
  lastPaymentBankAccountId: string | null
}
