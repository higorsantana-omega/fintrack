import { Goal, GoalDetail, GoalReminder, GoalsSummary } from '../entities/Goal'
import { httpClient } from './httpClient'

export interface GoalParams {
  name: string
  targetAmount: number
  monthlyContribution: number
  initialSaved: number
  contributionDay: number
  startDate: string
  endDate: string
  bankAccountId: string
}

export interface ContributionParams {
  goalId: string
  value: number
  date: string
}

export type ResolveReminderParams = {
  goalId: string
  month: string
} & (
  | { action: 'CONFIRM', value: number }
  | { action: 'SKIP' }
)

export interface ArchiveGoalParams {
  goalId: string
  returnMoney: boolean
}

export async function create(params: GoalParams) {
  const { data } = await httpClient.post('/goals', params)
  return data
}

export async function update({ id, ...params }: GoalParams & { id: string }) {
  const { data } = await httpClient.put(`/goals/${id}`, params)
  return data
}

export async function remove(goalId: string) {
  const { data } = await httpClient.delete(`/goals/${goalId}`)
  return data
}

export async function getAll() {
  const { data } = await httpClient.get<Goal[]>('/goals')
  return data
}

export async function getById(goalId: string) {
  const { data } = await httpClient.get<GoalDetail>(`/goals/${goalId}`)
  return data
}

export async function getSummary() {
  const { data } = await httpClient.get<GoalsSummary>('/goals/summary')
  return data
}

export async function getReminders() {
  const { data } = await httpClient.get<GoalReminder[]>('/goals/reminders')
  return data
}

export async function contribute({ goalId, ...params }: ContributionParams) {
  const { data } = await httpClient.post(`/goals/${goalId}/contributions`, params)
  return data
}

export async function resolveReminder({ goalId, month, ...params }: ResolveReminderParams) {
  const { data } = await httpClient.post(`/goals/${goalId}/reminders/${month}`, params)
  return data
}

export async function archive({ goalId, returnMoney }: ArchiveGoalParams) {
  const { data } = await httpClient.post(`/goals/${goalId}/archive`, { returnMoney })
  return data
}

export const goalsService = {
  create,
  update,
  remove,
  getAll,
  getById,
  getSummary,
  getReminders,
  contribute,
  resolveReminder,
  archive
}
