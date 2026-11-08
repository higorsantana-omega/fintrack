import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  GENERAL_WISHLIST_KEY,
  WishlistItem,
  WishlistItemStatus,
  WishlistLink,
  WishlistList,
  WishlistPrice
} from '../../../app/entities/Wishlist'
import { useCategories } from '../../../app/hooks/useCategories'
import { useWishlistItems } from '../../../app/hooks/useWishlistItems'
import { useWishlistLists } from '../../../app/hooks/useWishlistLists'
import { wishlistService } from '../../../app/services/wishlistService'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { usePurchaseLaunch } from '../../components/PurchaseLaunch/usePurchaseLaunch'
import { ALL_LISTS, getVisibleItems } from './wishlistItems'

export type WishlistModal =
  | { kind: 'list', list?: WishlistList }
  | { kind: 'item', item?: WishlistItem }
  | { kind: 'link', item: WishlistItem, link?: WishlistLink }
  | { kind: 'price', link: WishlistLink }

export type WishlistDeleteTarget =
  | { kind: 'list', list: WishlistList }
  | { kind: 'item', item: WishlistItem }
  | { kind: 'link', link: WishlistLink }
  | { kind: 'price', price: WishlistPrice }

const LG_QUERY = '(min-width: 1024px)'

export function useWishlistController() {
  const queryClient = useQueryClient()
  const { openPurchaseLaunch } = usePurchaseLaunch()
  const { lists, isInitialLoading: isLoadingLists } = useWishlistLists()
  const { items, isInitialLoading: isLoadingItems } = useWishlistItems()
  const { categories } = useCategories()

  const [selectedListId, setSelectedListId] = useState<string>(ALL_LISTS)
  const [status, setStatus] = useState<WishlistItemStatus>('ACTIVE')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [modal, setModal] = useState<WishlistModal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WishlistDeleteTarget | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const generalList = lists.find(list => list.key === GENERAL_WISHLIST_KEY)
  // A list that no longer exists reads as Todas.
  const listId = lists.some(list => list.id === selectedListId) ? selectedListId : ALL_LISTS
  const visibleItems = getVisibleItems(items, listId, status)
  const listItemCount = items.filter(item => listId === ALL_LISTS || item.wishlistId === listId).length
  // A selection that is not in the list anymore (deleted, other filter) clears the panel.
  const selectedItem = visibleItems.find(item => item.id === selectedItemId) ?? null
  const listNames = new Map(lists.map(list => [list.id, list.name]))

  function selectList(id: string) {
    setSelectedListId(id)
    setSelectedItemId(null)
  }

  function selectStatus(next: WishlistItemStatus) {
    setStatus(next)
    setSelectedItemId(null)
  }

  function selectItem(id: string) {
    setSelectedItemId(id)

    // Below lg the panel is stacked under the list.
    if (!window.matchMedia(LG_QUERY).matches) {
      panelRef.current?.scrollIntoView({ block: 'start' })
    }
  }

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  }

  const { isLoading: isDeleting, mutateAsync: removeTarget } = useMutation(
    async (target: WishlistDeleteTarget) => {
      switch (target.kind) {
        case 'list': return wishlistService.removeList(target.list.id)
        case 'item': return wishlistService.removeItem(target.item.id)
        case 'link': return wishlistService.removeLink(target.link.id)
        case 'price': return wishlistService.removePrice(target.price.id)
      }
    }
  )

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      await removeTarget(deleteTarget)

      if (deleteTarget.kind === 'list') {
        // The items of the list went to Geral.
        setSelectedListId(generalList?.id ?? ALL_LISTS)
        setSelectedItemId(null)
      }

      await refresh()
      toast.success(DELETE_MESSAGES[deleteTarget.kind])
      setDeleteTarget(null)
    } catch {
      toast.error(DELETE_ERRORS[deleteTarget.kind])
    }
  }

  const { isLoading: isUpdatingStatus, mutateAsync: changeStatus } = useMutation(
    async ({ action, itemId }: { action: 'giveUp' | 'reactivate', itemId: string }) => {
      try {
        await wishlistService[action](itemId)
      } catch (error) {
        // 409: the item was already moved elsewhere.
        if (getApiErrorPayload(error).status !== 409) throw error
      }
    }
  )

  async function giveUp(item: WishlistItem) {
    try {
      await changeStatus({ action: 'giveUp', itemId: item.id })
      await refresh()
      toast.success('Item movido para Desistidos.')
    } catch {
      toast.error('Erro ao desistir do item!')
    }
  }

  async function reactivate(item: WishlistItem) {
    try {
      await changeStatus({ action: 'reactivate', itemId: item.id })
      await refresh()
      toast.success('Item reativado!')
    } catch {
      toast.error('Erro ao reativar o item!')
    }
  }

  // The window or the form opens from the layout; the item is bought only when the expense is saved.
  function buy(item: WishlistItem) {
    openPurchaseLaunch(item)
  }

  // A new item starts in the selected list, or in Geral when the selection is Todas.
  const newItemListId = listId === ALL_LISTS ? generalList?.id : listId

  return {
    isLoading: isLoadingLists || isLoadingItems,
    lists,
    categories,
    listId,
    listNames,
    status,
    visibleItems,
    hasItemsInList: listItemCount > 0,
    selectedItem,
    panelRef,
    selectList,
    selectStatus,
    selectItem,
    newItemListId,
    modal,
    openModal: setModal,
    closeModal: () => setModal(null),
    deleteTarget,
    askDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
    isDeleting,
    isUpdatingStatus,
    buy,
    giveUp,
    reactivate
  }
}

const DELETE_MESSAGES: Record<WishlistDeleteTarget['kind'], string> = {
  list: 'Lista excluída! Os itens foram para a Geral.',
  item: 'Item excluído!',
  link: 'Link excluído!',
  price: 'Registro de preço excluído!'
}

const DELETE_ERRORS: Record<WishlistDeleteTarget['kind'], string> = {
  list: 'Erro ao excluir a lista!',
  item: 'Erro ao excluir o item!',
  link: 'Erro ao excluir o link!',
  price: 'Erro ao excluir o registro de preço!'
}
