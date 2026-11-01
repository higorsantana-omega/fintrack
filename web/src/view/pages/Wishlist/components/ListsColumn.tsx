import { DotsHorizontalIcon, PlusIcon } from '@radix-ui/react-icons'
import { WishlistItemStatus, WishlistList } from '../../../../app/entities/Wishlist'
import { cn } from '../../../../app/utils/cn'
import { Button } from '../../../components/Button'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { ALL_LISTS, afterMenuClose } from '../wishlistItems'

const STATUS_TABS: { status: WishlistItemStatus, id: string, label: string }[] = [
  { status: 'ACTIVE', id: 'wishlist-status-active', label: 'Ativos' },
  { status: 'PURCHASED', id: 'wishlist-status-purchased', label: 'Comprados' },
  { status: 'GAVE_UP', id: 'wishlist-status-gave-up', label: 'Desistidos' }
]

interface ListsColumnProps {
  lists: WishlistList[]
  selectedListId: string
  status: WishlistItemStatus
  onSelectList(id: string): void
  onSelectStatus(status: WishlistItemStatus): void
  onCreate(): void
  onRename(list: WishlistList): void
  onDelete(list: WishlistList): void
}

const rowClassName = 'flex-1 min-w-0 h-11 px-3 rounded-xl text-left text-sm font-medium tracking-[-0.5px] truncate transition-colors'

export function ListsColumn({
  lists,
  selectedListId,
  status,
  onSelectList,
  onSelectStatus,
  onCreate,
  onRename,
  onDelete
}: ListsColumnProps) {
  return (
    <aside id='wishlist-lists' className='flex flex-col gap-4'>
      <div role='tablist' className='flex flex-wrap gap-1'>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.status}
            id={tab.id}
            type='button'
            role='tab'
            aria-selected={tab.status === status}
            onClick={() => onSelectStatus(tab.status)}
            className={cn(
              'h-9 px-3 rounded-full text-sm font-medium tracking-[-0.5px] whitespace-nowrap transition-colors text-gray-700 hover:bg-gray-200',
              tab.status === status && 'bg-teal-900 text-white hover:bg-teal-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className='flex items-center justify-between gap-2'>
        <strong className='text-gray-700 tracking-[-0.5px] text-sm'>Listas</strong>
        <Button id='wishlist-new-list' className='h-9 gap-1 px-3 text-sm whitespace-nowrap' ghost onClick={onCreate}>
          <PlusIcon className='w-4 h-4' />
          Nova lista
        </Button>
      </div>

      <ul className='space-y-1'>
        <li className='flex items-center gap-1'>
          <button
            id='wishlist-list-all'
            type='button'
            aria-pressed={selectedListId === ALL_LISTS}
            onClick={() => onSelectList(ALL_LISTS)}
            className={cn(
              rowClassName,
              'bg-white text-gray-700 hover:bg-gray-50',
              selectedListId === ALL_LISTS && 'bg-teal-900 text-white hover:bg-teal-900'
            )}
          >
            Todas
          </button>
          <div className='w-10 shrink-0' />
        </li>

        {lists.map(list => (
          <li key={list.id} className='wishlist-list flex items-center gap-1' data-list-name={list.name}>
            <button
              type='button'
              aria-pressed={selectedListId === list.id}
              onClick={() => onSelectList(list.id)}
              className={cn(
                rowClassName,
                'wishlist-list-select bg-white text-gray-700 hover:bg-gray-50',
                selectedListId === list.id && 'bg-teal-900 text-white hover:bg-teal-900'
              )}
            >
              {list.name}
            </button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button
                  type='button'
                  aria-label={`Ações de ${list.name}`}
                  className='wishlist-list-menu w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors'
                >
                  <DotsHorizontalIcon className='w-5 h-5' />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => afterMenuClose(() => onRename(list))}>Renomear</DropdownMenu.Item>
                {list.key !== 'general' && (
                  <DropdownMenu.Item className='text-red-900' onSelect={() => afterMenuClose(() => onDelete(list))}>Excluir</DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </li>
        ))}
      </ul>
    </aside>
  )
}
