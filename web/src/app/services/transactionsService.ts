import { httpClient } from './httpClient'

interface Category {
  id: string
  name: string
  icon: string
  type: 'INCOME' | 'EXPENSE'
}

interface CreateTransactionParams {
  bankAccountId: string
  categoryId: string
  name: string
  value: number
  date: string
  type: 'INCOME' | 'EXPENSE'
}

export async function create(params: CreateTransactionParams) {
  const { data } = await httpClient.post('/transactions', params)
  return data
}

export async function getAll() {
  const { data } = await httpClient.get<Category[]>('/categories')
  return data
}


export const transactionsService = {
  create,
  getAll
}