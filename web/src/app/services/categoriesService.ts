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

export interface CategorySummary {
  month: string
  type: Category['type']
  net: number
  categories: {
    id: string
    parentId: string | null
    direct: number
    total: number
    share: number
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

export const categoriesService = {
  getAll,
  getSummary,
  create,
  update,
  remove
}
