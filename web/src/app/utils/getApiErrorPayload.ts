import { isAxiosError } from 'axios'

/** A card invoice a bank account deletion would leave with a balance. */
export interface ReopenedInvoice {
  cardId: string
  cardName: string
  month: string
  balance: number
}

/** A debt whose installments a bank account deletion would reopen. */
export interface ReopenedDebt {
  debtId: string
  name: string
  installments: number[]
}

/** A person whose balance a bank account deletion would change. */
export interface ChangedBorrower {
  borrowerId: string
  name: string
  change: number
}

interface ApiErrorPayload {
  status?: number
  message?: string
  goals?: string[]
  /** Card invoices a bank account deletion would reopen. */
  invoices?: ReopenedInvoice[]
  /** Debt installments a bank account deletion would reopen. */
  debts?: ReopenedDebt[]
  /** People balances a bank account deletion would change. */
  borrowers?: ChangedBorrower[]
  /** The most a return can be, when it is above what the person owes. */
  maxReturn?: number
  /** What a card still owes when it cannot be archived. */
  owed?: number
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload {
  if (!isAxiosError(error)) return {}

  return {
    status: error.response?.status,
    ...error.response?.data
  }
}
