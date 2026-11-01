import { createContext, useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WishlistItem } from '../../../app/entities/Wishlist'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { useCards } from '../../../app/hooks/useCards'
import { useCategories } from '../../../app/hooks/useCategories'
import { wishlistService } from '../../../app/services/wishlistService'
import { getCategoryOptions } from '../../../app/utils/categories'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { toCalendarNoonIso } from '../../../app/utils/goalForm'
import { invalidateMoneyQueries } from '../../../app/utils/invalidateMoneyQueries'
import { CardEntryModal } from '../CardEntryModal'
import { TransactionFormModal } from '../TransactionFormModal'
import { SavedTransaction } from '../TransactionFormModal/useTransactionFormModalController'
import { PurchaseKind, PurchaseKindModal } from './PurchaseKindModal'

interface PurchaseLaunchCallbacks {
  /** The expense was saved. Called when the form closes, not when it saves. */
  onSaved?(): void
  /** The user closed the window or the form without saving. */
  onCancel?(): void
}

interface PurchaseLaunchContextValue {
  openPurchaseLaunch(item: WishlistItem, callbacks?: PurchaseLaunchCallbacks): void
}

export const PurchaseLaunchContext = createContext({} as PurchaseLaunchContextValue)

const CARD_TABS = ['PURCHASE', 'INSTALLMENTS'] as const

function formatInitialValue(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Comprei is offered by the reminder window and the item panel, so the
// choice between account and card, and the launch forms, live in the
// layout (KTD6).
export function PurchaseLaunchProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<{ item: WishlistItem, callbacks: PurchaseLaunchCallbacks } | null>(null)

  const openPurchaseLaunch = useCallback((item: WishlistItem, callbacks: PurchaseLaunchCallbacks = {}) => {
    setRequest({ item, callbacks })
  }, [])

  function handleFinish(wasSaved: boolean) {
    if (wasSaved) request?.callbacks.onSaved?.()
    else request?.callbacks.onCancel?.()
    setRequest(null)
  }

  return (
    <PurchaseLaunchContext.Provider value={{ openPurchaseLaunch }}>
      {children}

      {request && (
        <PurchaseLaunchFlow
          key={request.item.id}
          item={request.item}
          onFinish={handleFinish}
        />
      )}
    </PurchaseLaunchContext.Provider>
  )
}

interface PurchaseLaunchFlowProps {
  item: WishlistItem
  onFinish(wasSaved: boolean): void
}

function PurchaseLaunchFlow({ item, onFinish }: PurchaseLaunchFlowProps) {
  const queryClient = useQueryClient()
  const { accounts, isFetching: isFetchingAccounts } = useBankAccounts()
  const { cards, isInitialLoading: isLoadingCards } = useCards()
  const { categories, isFetching: isFetchingCategories } = useCategories()
  const [kind, setKind] = useState<PurchaseKind | null>(null)
  const wasSaved = useRef(false)

  const activeCards = cards.filter(card => !card.archivedAt)
  const isLoading = isLoadingCards
    || (isFetchingAccounts && accounts.length === 0)
    || (isFetchingCategories && categories.length === 0)

  // Only an item category the expense picker offers is prefilled.
  const categoryId = getCategoryOptions(categories, 'EXPENSE')
    .some(option => option.value === item.category?.id)
    ? item.category!.id
    : undefined
  const initialValues = {
    name: item.name,
    value: item.lowestPrice ? formatInitialValue(item.lowestPrice.value) : '',
    categoryId,
    date: new Date()
  }

  // The item is bought only once the expense exists (KTD5). A 409 means it
  // was resolved elsewhere in the meantime.
  async function handleSaved(saved: SavedTransaction) {
    wasSaved.current = true

    try {
      await wishlistService.purchase({
        itemId: item.id,
        paidValue: saved.value,
        paidDate: toCalendarNoonIso(saved.date)
      })
    } catch (error) {
      if (getApiErrorPayload(error).status !== 409) {
        toast.error('A despesa foi salva, mas não foi possível marcar o item como comprado.')
        return
      }
    }

    queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    invalidateMoneyQueries(queryClient)
  }

  function handleClose() {
    onFinish(wasSaved.current)
  }

  if (kind === 'ACCOUNT') {
    return (
      <TransactionFormModal
        open
        type='EXPENSE'
        initialValues={initialValues}
        onSaved={handleSaved}
        onClose={handleClose}
      />
    )
  }

  if (kind === 'CARD') {
    return (
      <CardEntryModal
        cards={activeCards}
        initialValues={initialValues}
        allowedTabs={[...CARD_TABS]}
        hideInProgress
        onSaved={handleSaved}
        onClose={handleClose}
      />
    )
  }

  return (
    <PurchaseKindModal
      itemName={item.name}
      isLoading={isLoading}
      hasAccount={accounts.length > 0}
      hasCard={activeCards.length > 0}
      onSelect={setKind}
      onClose={handleClose}
    />
  )
}
