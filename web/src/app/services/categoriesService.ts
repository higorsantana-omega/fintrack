import { httpClient } from './httpClient'

interface Category {
  id: string
  name: string
  icon: string
  type: 'INCOME' | 'EXPENSE'
}

export async function getAll() {
  const { data } = await httpClient.get<Category[]>('/categories')
  return data
}


export const categoriesService = {
  getAll
}