import { isAxiosError } from 'axios'

/** A card invoice a bank account deletion would leave with a balance. */
export interface ReopenedInvoice {
  cardId: string
  cardName: string
  month: string
  balance: number
}

interface ApiErrorPayload {
  status?: number
  message?: string
  goals?: string[]
  /** Card invoices a bank account deletion would reopen. */
  invoices?: ReopenedInvoice[]
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
