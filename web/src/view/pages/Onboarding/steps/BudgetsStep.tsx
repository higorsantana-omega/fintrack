import { useEffect, useState } from 'react'
import { useCategories } from '../../../../app/hooks/useCategories'
import { useCategoriesSummary } from '../../../../app/hooks/useCategoriesSummary'
import { Category, CategoryBudget } from '../../../../app/services/categoriesService'
import { buildCategoryTree, getCategoryName } from '../../../../app/utils/categories'
import { getCurrentMonth } from '../../../../app/utils/debtForm'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { CategoryBudgetModal } from '../../Categories/modals/CategoryBudgetModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItemList, StepLoader } from '../components/StepItems'

export function BudgetsStep() {
  const { setHasItems } = useOnboarding()
  const [month] = useState(getCurrentMonth)
  const { categories } = useCategories()
  const { summary } = useCategoriesSummary(month, 'EXPENSE')
  const [editing, setEditing] = useState<{ category: Category, budget: CategoryBudget | null } | null>(null)

  const hasBudgets = !!summary?.categories.some(row => row.budget)

  useEffect(() => {
    setHasItems(hasBudgets)
  }, [hasBudgets, setHasItems])

  if (!summary || categories.length === 0) return <StepLoader />

  const budgetOf = (category: Category) => summary.categories.find(row => row.id === category.id)?.budget ?? null
  const rows = buildCategoryTree(categories, 'EXPENSE').flatMap(({ category, subcategories }) => [category, ...subcategories])

  return (
    <>
      <StepItemList>
        {rows.map(category => {
          const budget = budgetOf(category)

          return (
            <StepItem
              key={category.id}
              name={getCategoryName(category)}
              detail={budget ? 'Limite mensal' : 'Sem limite'}
              value={budget ? formatCurrency(budget.limit) : undefined}
              color={category.color ?? undefined}
              className={category.parentId ? 'pl-12' : undefined}
              onClick={() => setEditing({ category, budget })}
            />
          )
        })}
      </StepItemList>

      {editing && (
        <CategoryBudgetModal
          category={editing.category}
          budget={editing.budget}
          month={month}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
