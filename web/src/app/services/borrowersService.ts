import {
  Borrower,
  BorrowerDetail,
  BorrowerMovementKind
} from '../entities/Borrower'
import { httpClient } from './httpClient'

export interface BorrowerParams {
  name: string
  /** What the person already owed before the app; left as is when omitted. */
  openingBalance?: number
}

export interface BorrowerMovementParams {
  borrowerId: string
  kind: BorrowerMovementKind
  bankAccountId: string
  value: number
  date: string
}

export async function create(params: BorrowerParams) {
  const { data } = await httpClient.post<{ id: string }>('/borrowers', params)
  return data
}

export async function update({ id, ...params }: BorrowerParams & { id: string }) {
  const { data } = await httpClient.put(`/borrowers/${id}`, params)
  return data
}

export async function remove(borrowerId: string) {
  const { data } = await httpClient.delete(`/borrowers/${borrowerId}`)
  return data
}

export async function getAll() {
  const { data } = await httpClient.get<Borrower[]>('/borrowers')
  return data
}

export async function getById(borrowerId: string) {
  const { data } = await httpClient.get<BorrowerDetail>(`/borrowers/${borrowerId}`)
  return data
}

export async function createMovement({ borrowerId, ...params }: BorrowerMovementParams) {
  const { data } = await httpClient.post(`/borrowers/${borrowerId}/movements`, params)
  return data
}

export const borrowersService = {
  create,
  update,
  remove,
  getAll,
  getById,
  createMovement
}
