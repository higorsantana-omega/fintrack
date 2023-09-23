import { httpClient } from './httpClient'

interface BankAccountParams {
  name: string
  initialBalance: number
  color: string
  type: 'INVESTMENT' | 'CHECKING' | 'CASH'
}

interface BankAccountResponse {
  id: string
  userId: string
  name: string
  initialBalance: number
  type: 'CHECKING' | 'INVESTMENT' | 'CASH'
  color: string
  currentBalance: number
}

export async function create(params: BankAccountParams) {
  const { data } = await httpClient.post('/bank-accounts', params)
  return data
}

export async function update(params: BankAccountParams & { id: string }) {
  const { data } = await httpClient.put(`/bank-accounts/${params.id}`, params)
  return data
}

export async function remove(bankAccountId: string) {
  const { data } = await httpClient.delete(`/bank-accounts/${bankAccountId}`)
  return data
}


export async function getAll() {
  const { data } = await httpClient.get<BankAccountResponse[]>('/bank-accounts')
  return data
}


export const bankAccountsService = {
  create,
  update,
  remove,
  getAll
}