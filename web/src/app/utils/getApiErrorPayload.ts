import { isAxiosError } from 'axios'

interface ApiErrorPayload {
  status?: number
  message?: string
  goals?: string[]
  /** Card invoices a bank account deletion would reopen. */
  invoices?: {
    cardId: string
    cardName: string
    month: string
    balance: number
  }[]
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
