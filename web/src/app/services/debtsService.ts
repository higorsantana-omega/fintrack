import {
  Debt,
  DebtDetail,
  DebtReminder,
  DebtsSummary
} from '../entities/Debt'
import { httpClient } from './httpClient'

export interface DebtParams {
  name: string
  installmentValue: number
  installmentsCount: number
  dueDay: number
  nextInstallment: number
  nextInstallmentMonth: string
  /** The loan money received; both fields together or neither. */
  entryBankAccountId?: string
  entryValue?: number
}

export interface UpdateDebtParams {
  id: string
  name: string
  dueDay: number
  /** The three fields below only change while no installment has a payment. */
  installmentsCount?: number
  nextInstallment?: number
  nextInstallmentMonth?: string
}

export interface ExpectedValueParams {
  debtId: string
  fromInstallment: number
  value: number
}

export interface DebtPaymentParams {
  debtId: string
  installmentNumbers: number[]
  bankAccountId: string
  value: number
  date: string
}

export async function create(params: DebtParams) {
  const { data } = await httpClient.post<{ id: string }>('/debts', params)
  return data
}

export async function update({ id, ...params }: UpdateDebtParams) {
  const { data } = await httpClient.put(`/debts/${id}`, params)
  return data
}

export async function updateExpectedValue({ debtId, ...params }: ExpectedValueParams) {
  const { data } = await httpClient.put(`/debts/${debtId}/expected-value`, params)
  return data
}

export async function remove(debtId: string) {
  const { data } = await httpClient.delete(`/debts/${debtId}`)
  return data
}

export async function getAll() {
  const { data } = await httpClient.get<Debt[]>('/debts')
  return data
}

export async function getById(debtId: string) {
  const { data } = await httpClient.get<DebtDetail>(`/debts/${debtId}`)
  return data
}

export async function getSummary() {
  const { data } = await httpClient.get<DebtsSummary>('/debts/summary')
  return data
}

export async function getReminders() {
  const { data } = await httpClient.get<DebtReminder[]>('/debts/reminders')
  return data
}

export async function pay({ debtId, ...params }: DebtPaymentParams) {
  const { data } = await httpClient.post(`/debts/${debtId}/payments`, params)
  return data
}

export const debtsService = {
  create,
  update,
  updateExpectedValue,
  remove,
  getAll,
  getById,
  getSummary,
  getReminders,
  pay
}
