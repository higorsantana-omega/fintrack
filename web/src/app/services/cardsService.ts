import {
  CardEntryKind,
  CardsSummary,
  CreditCard,
  CreditCardDetail,
  InvoiceReminder
} from '../entities/CreditCard'
import { httpClient } from './httpClient'

export interface CardParams {
  name: string
  color: string
  limit: number
  closingDay: number
  dueDay: number
}

export interface CardPurchaseParams {
  kind: CardEntryKind
  description: string
  categoryId?: string
  /** The total, or the installment value of a purchase already in progress. */
  value: number
  date: string
  installmentsCount?: number
  currentInstallment?: number
  anchorInvoiceMonth?: string
}

export interface RecurringChargeParams {
  description: string
  value: number
  categoryId: string
}

export interface InvoicePaymentParams {
  cardId: string
  month: string
  bankAccountId: string
  value: number
  date: string
}

export async function create(params: CardParams) {
  const { data } = await httpClient.post<{ id: string }>('/cards', params)
  return data
}

export async function update({ id, ...params }: CardParams & { id: string }) {
  const { data } = await httpClient.put(`/cards/${id}`, params)
  return data
}

export async function remove(cardId: string) {
  const { data } = await httpClient.delete(`/cards/${cardId}`)
  return data
}

export async function archive(cardId: string) {
  const { data } = await httpClient.post(`/cards/${cardId}/archive`)
  return data
}

export async function getAll() {
  const { data } = await httpClient.get<CreditCard[]>('/cards')
  return data
}

export async function getById(cardId: string) {
  const { data } = await httpClient.get<CreditCardDetail>(`/cards/${cardId}`)
  return data
}

export async function getSummary() {
  const { data } = await httpClient.get<CardsSummary>('/cards/summary')
  return data
}

export async function getReminders() {
  const { data } = await httpClient.get<InvoiceReminder[]>('/cards/reminders')
  return data
}

export async function createPurchase({ cardId, ...params }: CardPurchaseParams & { cardId: string }) {
  const { data } = await httpClient.post(`/cards/${cardId}/purchases`, params)
  return data
}

export async function updatePurchase({ cardId, purchaseId, ...params }: Omit<CardPurchaseParams, 'kind' | 'anchorInvoiceMonth'> & { cardId: string, purchaseId: string }) {
  const { data } = await httpClient.put(`/cards/${cardId}/purchases/${purchaseId}`, params)
  return data
}

export async function removePurchase({ cardId, purchaseId }: { cardId: string, purchaseId: string }) {
  const { data } = await httpClient.delete(`/cards/${cardId}/purchases/${purchaseId}`)
  return data
}

export async function createRecurringCharge({ cardId, ...params }: RecurringChargeParams & { cardId: string, firstChargeDate: string }) {
  const { data } = await httpClient.post(`/cards/${cardId}/recurring-charges`, params)
  return data
}

export async function updateRecurringCharge({ cardId, recurringChargeId, ...params }: RecurringChargeParams & { cardId: string, recurringChargeId: string }) {
  const { data } = await httpClient.put(`/cards/${cardId}/recurring-charges/${recurringChargeId}`, params)
  return data
}

export async function cancelRecurringCharge({ cardId, recurringChargeId }: { cardId: string, recurringChargeId: string }) {
  const { data } = await httpClient.post(`/cards/${cardId}/recurring-charges/${recurringChargeId}/cancel`)
  return data
}

export async function payInvoice({ cardId, month, ...params }: InvoicePaymentParams) {
  const { data } = await httpClient.post(`/cards/${cardId}/invoices/${month}/payments`, params)
  return data
}

export const cardsService = {
  create,
  update,
  remove,
  archive,
  getAll,
  getById,
  getSummary,
  getReminders,
  createPurchase,
  updatePurchase,
  removePurchase,
  createRecurringCharge,
  updateRecurringCharge,
  cancelRecurringCharge,
  payInvoice
}
