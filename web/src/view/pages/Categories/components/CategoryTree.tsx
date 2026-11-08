import { ChevronDownIcon, ChevronRightIcon, DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Category, CategoryBudget } from '../../../../app/services/categoriesService'
import { getCategoryName, isSystemCategory } from '../../../../app/utils/categories'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { DEBT_CATEGORY_KEY, SEM_CATEGORIA_LABEL } from '../../../constants/CategoryConstants'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { CategoryIcon } from '../../../components/icons/categories/CategoryIcon'
import { CategoryRow, CategoriesTab } from '../useCategoriesController'

interface CategoryTreeProps {
  tab: CategoriesTab
  rows: CategoryRow[]
  collapsed: string[]
  noCategoryTotal: number | null
  onToggle(categoryId: string): void
  onOpenItems(categoryId: string | null): void
  onCreateSubcategory(parent: Category): void
  onEdit(category: Category): void
  onDelete(category: Category): void
  onBudget(category: Category, budget: CategoryBudget | null): void
}

const BAR_COLORS = { OK: 'bg-teal-900', WARNING: 'bg-orange-400', OVER: 'bg-red-900' } as const

/** The "spent / limit" bar of a category with a limit; every number comes from the API (R6, R8). */
function BudgetBar({ name, total, budget }: { name: string, total: number, budget: CategoryBudget }) {
  const spentPercent = Math.min(100, Math.max(0, (total / budget.limit) * 100))
  const left = budget.remaining >= 0
    ? `restam ${formatCurrency(budget.remaining)}`
    : `${formatCurrency(-budget.remaining)} acima do limite`

  return (
    <div className='category-budget pl-1 pr-3 pb-1' data-status={budget.status}>
      <div
        role='progressbar'
        aria-label={`Limite de ${name}`}
        aria-valuemin={0}
        aria-valuemax={budget.limit}
        aria-valuenow={total}
        className='h-1.5 rounded-full bg-gray-200 overflow-hidden'
      >
        <div className={cn('h-full rounded-full', BAR_COLORS[budget.status])} style={{ width: `${spentPercent}%` }} />
      </div>
      <p className={cn('category-budget-text mt-1 text-xs', budget.status === 'OVER' ? 'text-red-900' : 'text-gray-600')}>
        {formatCurrency(total)} de {formatCurrency(budget.limit)}, {left}
      </p>
    </div>
  )
}

interface RowMenuProps {
  category: Category
  /** Null when the category has no limit; undefined when the tab has no limits (income). */
  budget: CategoryBudget | null | undefined
  canCreateSubcategory: boolean
  onCreateSubcategory(parent: Category): void
  onEdit(category: Category): void
  onDelete(category: Category): void
  onBudget(category: Category, budget: CategoryBudget | null): void
}

/** Only the actions that apply to the row (R26); a row with none gets no menu. */
function RowMenu({ category, budget, canCreateSubcategory, onCreateSubcategory, onEdit, onDelete, onBudget }: RowMenuProps) {
  const isOwn = category.key === null
  const canHaveBudget = budget !== undefined

  if (!canCreateSubcategory && !isOwn && !canHaveBudget) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type='button'
          aria-label={`Ações de ${getCategoryName(category)}`}
          className='category-menu w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors'
        >
          <DotsHorizontalIcon className='w-5 h-5' />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        {canCreateSubcategory && (
          <DropdownMenu.Item onSelect={() => onCreateSubcategory(category)}>Criar subcategoria</DropdownMenu.Item>
        )}
        {canHaveBudget && (
          <DropdownMenu.Item onSelect={() => onBudget(category, budget)}>
            {budget ? 'Editar limite' : 'Definir limite'}
          </DropdownMenu.Item>
        )}
        {isOwn && <DropdownMenu.Item onSelect={() => onEdit(category)}>Editar</DropdownMenu.Item>}
        {isOwn && (
          <DropdownMenu.Item className='text-red-900' onSelect={() => onDelete(category)}>Excluir</DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

export function CategoryTree({
  tab,
  rows,
  collapsed,
  noCategoryTotal,
  onToggle,
  onOpenItems,
  onCreateSubcategory,
  onEdit,
  onDelete,
  onBudget
}: CategoryTreeProps) {
  const iconType = tab === 'EXPENSE' ? 'expense' : 'income'
  const menuHandlers = { onCreateSubcategory, onEdit, onDelete, onBudget }
  // Only the expense tab has limits (R1); its tree holds just the categories that count in the totals.
  const budgetOf = (budget: CategoryBudget | null) => tab === 'EXPENSE' ? budget : undefined

  return (
    <ul id='categories-tree' className='space-y-2'>
      {rows.map(({ category, total, budget, subcategories }) => {
        const name = getCategoryName(category)
        const isCollapsed = collapsed.includes(category.id)
        const canHaveSubcategories = category.key !== DEBT_CATEGORY_KEY && !isSystemCategory(category)

        return (
          <li key={category.id} className='category-group bg-white rounded-2xl'>
            <div className={cn('flex items-center gap-1 p-2 pr-1', total === 0 && 'opacity-50')}>
              <button
                type='button'
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Expandir' : 'Recolher'} ${name}`}
                disabled={subcategories.length === 0}
                onClick={() => onToggle(category.id)}
                className='w-8 h-10 shrink-0 flex items-center justify-center text-gray-700 disabled:opacity-0'
              >
                {isCollapsed ? <ChevronRightIcon className='w-4 h-4' /> : <ChevronDownIcon className='w-4 h-4' />}
              </button>

              <button
                type='button'
                onClick={() => onOpenItems(category.id)}
                className='category-open flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl py-1 hover:bg-gray-50 transition-colors'
              >
                <CategoryIcon type={iconType} category={category} />
                <div className='flex-1 min-w-0'>
                  <strong className='category-name block truncate text-gray-800 tracking-[-0.5px]'>{name}</strong>
                  <span className='text-xs text-gray-600'>
                    {subcategories.length === 1 ? '1 subcategoria' : `${subcategories.length} subcategorias`}
                  </span>
                </div>
                <span className='category-total text-gray-800 font-medium pr-2'>{formatCurrency(total)}</span>
              </button>

              <div className='w-10 shrink-0'>
                <RowMenu category={category} budget={budgetOf(budget)} canCreateSubcategory={canHaveSubcategories} {...menuHandlers} />
              </div>
            </div>
            {budget && (
              <div className='pl-11'>
                <BudgetBar name={name} total={total} budget={budget} />
              </div>
            )}

            {!isCollapsed && subcategories.length > 0 && (
              <ul className='pb-2 space-y-1'>
                {subcategories.map(sub => (
                  <li key={sub.category.id} className='category-sub'>
                    <div className={cn('flex items-center gap-1 pl-10 pr-1', sub.total === 0 && 'opacity-50')}>
                      <button
                        type='button'
                        onClick={() => onOpenItems(sub.category.id)}
                        className='category-open flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl py-1 hover:bg-gray-50 transition-colors'
                      >
                        <CategoryIcon type={iconType} category={sub.category} />
                        <strong className='category-name flex-1 min-w-0 truncate text-sm font-medium text-gray-800 tracking-[-0.5px]'>
                          {getCategoryName(sub.category)}
                        </strong>
                        <span className='category-total text-sm text-gray-800 pr-2'>{formatCurrency(sub.total)}</span>
                      </button>

                      <div className='w-10 shrink-0'>
                        <RowMenu category={sub.category} budget={budgetOf(sub.budget)} canCreateSubcategory={false} {...menuHandlers} />
                      </div>
                    </div>
                    {sub.budget && (
                      <div className='pl-[4.25rem]'>
                        <BudgetBar name={getCategoryName(sub.category)} total={sub.total} budget={sub.budget} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}

      {noCategoryTotal !== null && (
        <li id='categories-none' className='category-group bg-white rounded-2xl'>
          <div className='flex items-center gap-1 p-2 pr-1'>
            <div className='w-8 shrink-0' />
            <button
              type='button'
              onClick={() => onOpenItems(null)}
              className='category-open flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl py-1 hover:bg-gray-50 transition-colors'
            >
              <CategoryIcon type={iconType} />
              <strong className='category-name flex-1 min-w-0 truncate text-gray-800 tracking-[-0.5px]'>{SEM_CATEGORIA_LABEL}</strong>
              <span className='category-total text-gray-800 font-medium pr-2'>{formatCurrency(noCategoryTotal)}</span>
            </button>
            <div className='w-10 shrink-0' />
          </div>
        </li>
      )}
    </ul>
  )
}
