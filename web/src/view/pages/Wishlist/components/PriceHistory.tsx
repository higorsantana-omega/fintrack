import { TrashIcon } from '@radix-ui/react-icons'
import { WishlistPrice } from '../../../../app/entities/Wishlist'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatDateOf } from '../wishlistItems'

interface PriceHistoryProps {
  prices: WishlistPrice[]
  onDelete(price: WishlistPrice): void
}

// Oldest first, as the API sends it (KTD13).
export function PriceHistory({ prices, onDelete }: PriceHistoryProps) {
  if (prices.length === 0) {
    return <p className='text-gray-600 text-sm py-2'>Nenhum preço registrado ainda.</p>
  }

  return (
    <ul className='wishlist-price-history space-y-1'>
      {prices.map(price => (
        <li key={price.id} className='wishlist-price flex items-center justify-between gap-2 text-sm'>
          <span className='text-gray-600'>{formatDateOf(price.recordedOn)}</span>
          <span className='flex items-center gap-1'>
            <span className='wishlist-price-value text-gray-800 font-medium'>{formatCurrency(price.value)}</span>
            <button
              type='button'
              aria-label={`Excluir o registro de ${formatCurrency(price.value)}`}
              onClick={() => onDelete(price)}
              className='wishlist-price-delete w-8 h-8 rounded-lg flex items-center justify-center text-red-900 hover:bg-gray-100 transition-colors'
            >
              <TrashIcon className='w-4 h-4' />
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}
