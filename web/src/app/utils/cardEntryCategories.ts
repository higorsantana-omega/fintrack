import { Category } from '../services/categoriesService'

// Mirror the API's category icons for "Metas" and "Fatura de cartão".
export const GOAL_CATEGORY_ICON = 'goal'
export const CARD_PAYMENT_CATEGORY_ICON = 'credit-card'

// Card entries take an expense category other than those two (KTD8).
const EXCLUDED_ICONS = [GOAL_CATEGORY_ICON, CARD_PAYMENT_CATEGORY_ICON]

export function getCardEntryCategories(categories: Category[]) {
  return categories.filter(category => category.type === 'EXPENSE' && !EXCLUDED_ICONS.includes(category.icon))
}
