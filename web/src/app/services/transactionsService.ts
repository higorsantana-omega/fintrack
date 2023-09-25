import { Transaction } from '../entities/Transaction'
import { httpClient } from './httpClient'

interface CreateTransactionParams {
  bankAccountId: string
  categoryId: string
  name: string
  value: number
  date: string
  type: 'INCOME' | 'EXPENSE'
}

export type TransactionsFilters = {
  month: number
  year: number
  bankAccountId?: string
  type?: Transaction['type']
}

export async function create(params: CreateTransactionParams) {
  const { data } = await httpClient.post('/transactions', params)
  return data
}

export async function getAll(filters: TransactionsFilters) {
  const { data } = await httpClient.get<Transaction[]>('/transactions', {
    params: filters
  })
  return data
}


export const transactionsService = {
  create,
  getAll
}