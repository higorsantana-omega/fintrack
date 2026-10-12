import { isAxiosError } from 'axios'

interface ApiErrorPayload {
  status?: number
  message?: string
  goals?: string[]
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload {
  if (!isAxiosError(error)) return {}

  return {
    status: error.response?.status,
    ...error.response?.data
  }
}
