import { PlusIcon } from '@radix-ui/react-icons'
import { WishlistItem, WishlistItemStatus } from '../../../../app/entities/Wishlist'
import { getCategoryName } from '../../../../app/utils/categories'
import { cn } from '../../../../app/utils/cn'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { Button } from '../../../components/Button'
import { formatDateOf, formatPlanned } from '../wishlistItems'

const FILTER_EMPTY_MESSAGES: Record<WishlistItemStatus, string> = {
  ACTIVE: 'Nenhum item ativo aqui.',
  PURCHASED: 'Nenhum item comprado aqui.',
  GAVE_UP: 'Nenhum item desistido aqui.'
}

interface ItemsListProps {
  items: WishlistItem[]
  status: WishlistItemStatus
  selectedItemId: string | null
  /** Todas: each row also names its list. */
  listNames: Map<string, string> | null
  /** Whether the list holds any item, in any state. */
  hasItemsInList: boolean
  onSelect(id: string): void
  onCreate(): void
}

function ItemSummary({ item, status }: { item: WishlistItem, status: WishlistItemStatus }) {
  if (status === 'PURCHASED') {
    return (
      <span className='wishlist-item-paid text-sm text-teal-900 font-medium whitespace-nowrap'>
        {item.paidValue !== null ? formatCurrency(item.paidValue) : '—'}
        {item.paidDate && ` · ${formatDateOf(item.paidDate)}`}
      </span>
    )
  }

  if (status === 'GAVE_UP') return null

  if (!item.lowestPrice) {
    return <span className='wishlist-item-price text-sm text-gray-600 whitespace-nowrap'>Sem preço</span>
  }

  return (
    <span className='wishlist-item-price text-sm text-gray-800 font-medium text-right'>
      {formatCurrency(item.lowestPrice.value)}
      <span className='block text-xs text-gray-600 font-normal truncate'>{item.lowestPrice.storeName}</span>
    </span>
  )
}

export function ItemsList({ items, status, selectedItemId, listNames, hasItemsInList, onSelect, onCreate }: ItemsListProps) {
  return (
    <div id='wishlist-items' className='flex flex-col gap-4 min-w-0'>
      <div className='flex items-center justify-between gap-2'>
        <strong className='text-gray-700 tracking-[-0.5px] text-sm'>Itens</strong>
        <Button id='wishlist-new-item' className='h-9 gap-1 px-3 text-sm whitespace-nowrap' onClick={onCreate}>
          <PlusIcon className='w-4 h-4' />
          Novo item
        </Button>
      </div>

      {!hasItemsInList && (
        <div id='wishlist-empty-list' className='bg-white rounded-2xl py-10 px-4 flex flex-col items-center gap-4 text-center text-gray-600'>
          {listNames ? 'Você ainda não guardou nenhum item.' : 'Esta lista ainda não tem itens.'}
          <Button id='wishlist-empty-new-item' className='h-10 gap-2 px-4' onClick={onCreate}>
            <PlusIcon className='w-4 h-4' />
            Criar item
          </Button>
        </div>
      )}

      {hasItemsInList && items.length === 0 && (
        <div id='wishlist-empty-filter' className='bg-white rounded-2xl py-10 px-4 text-center text-gray-600'>
          {FILTER_EMPTY_MESSAGES[status]}
        </div>
      )}

      {items.length > 0 && (
        <ul className='space-y-2'>
          {items.map(item => (
            <li key={item.id}>
              <button
                type='button'
                aria-pressed={item.id === selectedItemId}
                data-item-name={item.name}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'wishlist-item w-full bg-white p-4 rounded-2xl flex items-center justify-between gap-4 text-left border-2 border-transparent hover:bg-gray-50 transition-colors',
                  item.id === selectedItemId && 'border-teal-900'
                )}
              >
                <div className='min-w-0'>
                  <strong className='wishlist-item-name block truncate font-bold tracking-[-0.5px] text-gray-800'>{item.name}</strong>
                  <span className='block text-sm text-gray-600 truncate'>
                    {[
                      listNames && listNames.get(item.wishlistId),
                      item.category && getCategoryName(item.category),
                      status === 'ACTIVE' && formatPlanned(item)
                    ].filter(Boolean).join(' · ')}
                  </span>
                </div>

                <ItemSummary item={item} status={status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
