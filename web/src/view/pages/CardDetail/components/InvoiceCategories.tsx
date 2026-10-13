import { CardInvoice } from '../../../../app/entities/CreditCard'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { CategoryIcon } from '../../../components/icons/categories/CategoryIcon'

interface InvoiceCategoriesProps {
  categories: CardInvoice['categories']
}

export function InvoiceCategories({ categories }: InvoiceCategoriesProps) {
  if (categories.length === 0) {
    return <p className='text-gray-600 text-sm py-6 text-center'>Nenhum lançamento nesta fatura.</p>
  }

  return (
    <ul id='invoice-categories' className='space-y-2'>
      {categories.map(({ category, total, share }) => (
        <li key={category?.id ?? 'none'} className='bg-white p-4 rounded-2xl flex items-center gap-3'>
          <CategoryIcon type='expense' category={category?.icon} />
          <div className='flex-1 space-y-2'>
            <div className='flex justify-between gap-4 text-sm'>
              <strong className='category-name text-gray-800 tracking-[-0.5px]'>{category?.name ?? 'Sem categoria'}</strong>
              <span className='category-total text-gray-800 font-medium'>{formatCurrency(total)}</span>
            </div>
            <div className='h-2 rounded-full bg-gray-100 overflow-hidden' role='progressbar' aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className='h-full rounded-full bg-teal-900' style={{ width: `${share * 100}%` }} />
            </div>
          </div>
          <span className='text-xs text-gray-600 w-10 text-right'>{Math.round(share * 100)}%</span>
        </li>
      ))}
    </ul>
  )
}
