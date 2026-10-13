import { Category } from '../services/categoriesService'

// Mirrors the API (KTD8): card entries take an expense category other than
// "Metas" and "Fatura de cartão".
const EXCLUDED_ICONS = ['goal', 'credit-card']

export function getCardEntryCategories(categories: Category[]) {
  return categories.filter(category => category.type === 'EXPENSE' && !EXCLUDED_ICONS.includes(category.icon))
}
