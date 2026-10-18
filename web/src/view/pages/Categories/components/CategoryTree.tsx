import { ChevronDownIcon, ChevronRightIcon, DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Category } from '../../../../app/services/categoriesService'
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
}

interface RowMenuProps {
  category: Category
  canCreateSubcategory: boolean
  onCreateSubcategory(parent: Category): void
  onEdit(category: Category): void
  onDelete(category: Category): void
}

/** Only the actions that apply to the row (R26); a row with none gets no menu. */
function RowMenu({ category, canCreateSubcategory, onCreateSubcategory, onEdit, onDelete }: RowMenuProps) {
  const isOwn = category.key === null

  if (!canCreateSubcategory && !isOwn) return null

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
  onDelete
}: CategoryTreeProps) {
  const iconType = tab === 'EXPENSE' ? 'expense' : 'income'
  const menuHandlers = { onCreateSubcategory, onEdit, onDelete }

  return (
    <ul id='categories-tree' className='space-y-2'>
      {rows.map(({ category, total, subcategories }) => {
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
                <RowMenu category={category} canCreateSubcategory={canHaveSubcategories} {...menuHandlers} />
              </div>
            </div>

            {!isCollapsed && subcategories.length > 0 && (
              <ul className='pb-2 space-y-1'>
                {subcategories.map(sub => (
                  <li key={sub.category.id} className={cn('category-sub flex items-center gap-1 pl-10 pr-1', sub.total === 0 && 'opacity-50')}>
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
                      <RowMenu category={sub.category} canCreateSubcategory={false} {...menuHandlers} />
                    </div>
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
