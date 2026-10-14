import { Category } from '../services/categoriesService'

// Mirror the API's category icons for "Dívidas" and "Empréstimos".
export const DEBT_CATEGORY_ICON = 'debt'
export const LOAN_CATEGORY_ICON = 'loan'

const DEBT_ICONS = [DEBT_CATEGORY_ICON, LOAN_CATEGORY_ICON]

export function isDebtCategory(category: Pick<Category, 'icon'>) {
  return DEBT_ICONS.includes(category.icon)
}

// Only the debt and people screens create these entries (R34): the new
// transaction modal never offers them, and the edit modal only for a
// transaction already linked to a debt or a person.
export function getManualEntryCategories(categories: Category[], transaction?: { debtId?: string | null, borrowerId?: string | null }) {
  if (transaction?.debtId || transaction?.borrowerId) return categories

  return categories.filter(category => !isDebtCategory(category))
}
