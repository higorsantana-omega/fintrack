import { Category, CategorySummaryItem } from '../../../../../app/services/categoriesService'
import { getCategoryName } from '../../../../../app/utils/categories'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../app/utils/formatDate'
import { SEM_CATEGORIA_LABEL } from '../../../../constants/CategoryConstants'
import { Modal } from '../../../../components/Modal'

interface CategoryItemsModalProps {
  open: boolean
  /** Null for the "Sem categoria" list. */
  category: Category | null
  categories: Category[]
  items: CategorySummaryItem[]
  onClose(): void
}

/** Read-only list of the items that make up a category's total in the month (R36 to R39). */
export function CategoryItemsModal({ open, category, categories, items, onClose }: CategoryItemsModalProps) {
  // A group's list also holds its subcategories' items, each tagged with its own category.
  const showsSubcategory = !!category && category.parentId === null

  return (
    <Modal open={open} onClose={onClose} title={category ? getCategoryName(category) : SEM_CATEGORIA_LABEL}>
      {items.length === 0 && (
        <p className='text-gray-600 text-sm text-center py-6'>Nenhum item neste mês.</p>
      )}

      {items.length > 0 && (
        <ul id='category-items' className='space-y-2'>
          {items.map(item => {
            const itemCategory = categories.find(({ id }) => id === item.categoryId)
            const isInstallment = (item.installmentsCount ?? 1) > 1

            return (
              <li key={item.id} className='category-item bg-gray-100 rounded-2xl p-3 flex items-start gap-3'>
                <div className='flex-1 min-w-0 space-y-1'>
                  <strong className='item-description block truncate text-gray-800 tracking-[-0.5px]'>{item.description}</strong>
                  <span className='block text-xs text-gray-600'>
                    {formatDate(new Date(item.date))} · {item.source.name}
                    {showsSubcategory && itemCategory && itemCategory.id !== category.id && ` · ${getCategoryName(itemCategory)}`}
                  </span>
                  <div className='flex flex-wrap gap-1'>
                    {isInstallment && (
                      <span className='item-installment text-xs rounded-full bg-white px-2 py-0.5 text-gray-700'>
                        {item.installmentNumber}/{item.installmentsCount}
                      </span>
                    )}
                    {item.isForecast && (
                      <span className='item-forecast text-xs rounded-full bg-white px-2 py-0.5 text-gray-700'>Previsão</span>
                    )}
                    {item.isRefund && (
                      <span className='item-refund text-xs rounded-full bg-white px-2 py-0.5 text-gray-700'>Estorno</span>
                    )}
                  </div>
                </div>
                <span className='item-value text-gray-800 font-medium whitespace-nowrap'>{formatCurrency(item.value)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
