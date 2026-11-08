import { httpClient } from './httpClient'

export interface Category {
  id: string
  name: string
  /** English snake_case key of the default and system categories; null on the user's own. */
  key: string | null
  parentId: string | null
  /** Null on the user's own subcategories, which take the icon of their group. */
  icon: string | null
  /** Only on groups. */
  color: string | null
  type: 'INCOME' | 'EXPENSE'
}

export interface CategorySummaryItem {
  id: string
  date: string
  description: string
  /** Negative for a card refund. */
  value: number
  /** Null when the item counts under "Sem categoria". */
  categoryId: string | null
  source: { type: 'ACCOUNT' | 'CARD', id: string, name: string }
  installmentNumber: number | null
  installmentsCount: number | null
  isForecast: boolean
  isRefund: boolean
}

export type BudgetStatus = 'OK' | 'WARNING' | 'OVER'

/** The month's limit of a category, already computed by the API. */
export interface CategoryBudget {
  limit: number
  /** Whether the limit is the month's own override of the general one. */
  isAdjusted: boolean
  /** Negative past the limit. */
  remaining: number
  status: BudgetStatus
}

export interface CategorySummary {
  month: string
  type: Category['type']
  net: number
  /** Sum of the month's limits minus what they cover; null when no category has a limit. */
  balance: number | null
  categories: {
    id: string
    parentId: string | null
    direct: number
    total: number
    share: number
    budget: CategoryBudget | null
  }[]
  noCategory: { total: number, share: number }
  items: CategorySummaryItem[]
}

export interface CreateGroupParams {
  name: string
  type: Category['type']
  icon: string
  color: string
}

export interface CreateSubcategoryParams {
  name: string
  parentId: string
}

export interface UpdateCategoryParams {
  id: string
  name: string
  /** Groups only. */
  icon?: string
  color?: string
}

export interface DeleteCategoryParams {
  id: string
  /** Required for a group. */
  destinationCategoryId?: string
}

export interface SetBudgetParams {
  categoryId: string
  amount: number
  /** `YYYY-MM`: sets the override of that month only; without it, the general limit. */
  month?: string
}

export interface RemoveBudgetParams {
  categoryId: string
  /** `YYYY-MM`: removes the override of that month only; without it, the limit and all its overrides. */
  month?: string
}

const budgetPath = (categoryId: string, month?: string) =>
  `/categories/${categoryId}/budget${month ? `/${month}` : ''}`

export async function getAll() {
  const { data } = await httpClient.get<Category[]>('/categories')
  return data
}

export async function getSummary(month: string, type: Category['type']) {
  const { data } = await httpClient.get<CategorySummary>(`/categories/summary/${month}`, { params: { type } })
  return data
}

export async function create(params: CreateGroupParams | CreateSubcategoryParams) {
  const { data } = await httpClient.post<Category>('/categories', params)
  return data
}

export async function update({ id, ...params }: UpdateCategoryParams) {
  const { data } = await httpClient.put<Category>(`/categories/${id}`, params)
  return data
}

export async function remove({ id, destinationCategoryId }: DeleteCategoryParams) {
  const { data } = await httpClient.delete(`/categories/${id}`, { params: { destinationCategoryId } })
  return data
}

export async function setBudget({ categoryId, amount, month }: SetBudgetParams) {
  const { data } = await httpClient.put(budgetPath(categoryId, month), { amount })
  return data
}

export async function removeBudget({ categoryId, month }: RemoveBudgetParams) {
  const { data } = await httpClient.delete(budgetPath(categoryId, month))
  return data
}

export const categoriesService = {
  getAll,
  getSummary,
  create,
  update,
  remove,
  setBudget,
  removeBudget
}
