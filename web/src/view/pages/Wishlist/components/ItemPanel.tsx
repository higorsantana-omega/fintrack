import { DotsHorizontalIcon, ExternalLinkIcon, PlusIcon } from '@radix-ui/react-icons'
import { WishlistItem, WishlistLink, WishlistPrice } from '../../../../app/entities/Wishlist'
import { getCategoryName } from '../../../../app/utils/categories'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { Button } from '../../../components/Button'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { afterMenuClose, formatDateOf, formatPlanned } from '../wishlistItems'
import { PriceHistory } from './PriceHistory'

interface ItemPanelProps {
  item: WishlistItem | null
  listName: string
  isBusy: boolean
  onBuy(item: WishlistItem): void
  onGiveUp(item: WishlistItem): void
  onReactivate(item: WishlistItem): void
  onEdit(item: WishlistItem): void
  onDelete(item: WishlistItem): void
  onAddLink(item: WishlistItem): void
  onEditLink(item: WishlistItem, link: WishlistLink): void
  onDeleteLink(link: WishlistLink): void
  onAddPrice(link: WishlistLink): void
  onDeletePrice(price: WishlistPrice): void
}

function formatVariation(variation: number) {
  return `${variation > 0 ? '+' : ''}${formatCurrency(variation)}`
}

export function ItemPanel({
  item,
  listName,
  isBusy,
  onBuy,
  onGiveUp,
  onReactivate,
  onEdit,
  onDelete,
  onAddLink,
  onEditLink,
  onDeleteLink,
  onAddPrice,
  onDeletePrice
}: ItemPanelProps) {
  if (!item) {
    return (
      <div id='wishlist-panel-empty' className='bg-white rounded-2xl py-10 px-4 text-center text-gray-600'>
        Escolha um item para ver os detalhes.
      </div>
    )
  }

  return (
    <div id='wishlist-panel' className='bg-white rounded-2xl p-4 md:p-6 flex flex-col gap-6'>
      <div className='space-y-1'>
        <strong id='wishlist-panel-name' className='block text-gray-800 tracking-[-1px] text-lg break-words'>{item.name}</strong>
        <span className='block text-sm text-gray-600'>
          {[listName, item.category && getCategoryName(item.category), formatPlanned(item)].filter(Boolean).join(' · ')}
        </span>

        {item.status === 'PURCHASED' && (
          <span id='wishlist-panel-paid' className='block text-teal-900 font-medium'>
            Comprado{item.paidValue !== null && ` por ${formatCurrency(item.paidValue)}`}
            {item.paidDate && ` em ${formatDateOf(item.paidDate)}`}
          </span>
        )}

        {item.status === 'GAVE_UP' && (
          <span id='wishlist-panel-gave-up' className='block text-gray-700 font-medium'>Desistido</span>
        )}

        {item.lowestPrice && (
          <div id='wishlist-panel-lowest' className='pt-2'>
            <span className='block text-xs text-gray-600'>Menor preço</span>
            <strong className='wishlist-lowest-value text-gray-800 tracking-[-0.5px]'>{formatCurrency(item.lowestPrice.value)}</strong>
            <span className='wishlist-lowest-store text-sm text-gray-600'>
              {` · ${item.lowestPrice.storeName} · ${formatDateOf(item.lowestPrice.recordedOn)}`}
            </span>
          </div>
        )}
      </div>

      <div className='flex flex-wrap gap-2'>
        {item.status === 'ACTIVE' && (
          <>
            <Button id='wishlist-buy' className='h-10 px-4' disabled={isBusy} onClick={() => onBuy(item)}>Comprei</Button>
            <Button id='wishlist-give-up' className='h-10 px-4' ghost disabled={isBusy} onClick={() => onGiveUp(item)}>Desisti</Button>
          </>
        )}
        {item.status === 'GAVE_UP' && (
          <Button id='wishlist-reactivate' className='h-10 px-4' disabled={isBusy} onClick={() => onReactivate(item)}>Reativar</Button>
        )}
        <Button id='wishlist-edit' className='h-10 px-4' ghost onClick={() => onEdit(item)}>Editar</Button>
        <Button id='wishlist-delete' className='h-10 px-4 text-red-900 border-red-900' ghost onClick={() => onDelete(item)}>Excluir</Button>
      </div>

      <section className='space-y-3'>
        <div className='flex items-center justify-between gap-2'>
          <strong className='text-gray-800 tracking-[-0.5px]'>Links</strong>
          <Button id='wishlist-add-link' className='h-9 gap-1 px-3 text-sm whitespace-nowrap' ghost onClick={() => onAddLink(item)}>
            <PlusIcon className='w-4 h-4' />
            Adicionar link
          </Button>
        </div>

        {item.links.length === 0 && (
          <p id='wishlist-links-empty' className='text-gray-600 text-sm py-2'>
            Nenhum link ainda. Adicione a página do produto numa loja.
          </p>
        )}

        {item.links.map(link => (
          <div key={link.id} className='wishlist-link bg-gray-100 rounded-2xl p-4 space-y-3' data-store-name={link.storeName}>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <a
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='wishlist-link-store inline-flex items-center gap-1 font-bold tracking-[-0.5px] text-teal-900 hover:underline'
                >
                  {link.storeName}
                  <ExternalLinkIcon className='w-4 h-4 shrink-0' />
                </a>
                <div className='flex flex-wrap items-baseline gap-x-2'>
                  <span className='wishlist-link-price text-gray-800 font-medium'>
                    {link.currentPrice !== null ? formatCurrency(link.currentPrice) : 'Sem preço'}
                  </span>
                  {link.variation !== null && (
                    <span className='wishlist-link-variation text-sm text-gray-600'>
                      {formatVariation(link.variation)}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <button
                    type='button'
                    aria-label={`Ações do link ${link.storeName}`}
                    className='wishlist-link-menu w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors'
                  >
                    <DotsHorizontalIcon className='w-5 h-5' />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content>
                  <DropdownMenu.Item onSelect={() => afterMenuClose(() => onEditLink(item, link))}>Editar link</DropdownMenu.Item>
                  <DropdownMenu.Item className='text-red-900' onSelect={() => afterMenuClose(() => onDeleteLink(link))}>Excluir link</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>

            <PriceHistory prices={link.prices} onDelete={onDeletePrice} />

            <Button className='wishlist-add-price h-9 px-3 text-sm' ghost onClick={() => onAddPrice(link)}>
              Registrar preço
            </Button>
          </div>
        ))}
      </section>
    </div>
  )
}
