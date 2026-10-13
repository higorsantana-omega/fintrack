import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CardEntry, RecurringCharge } from '../../../app/entities/CreditCard'
import { useCard } from '../../../app/hooks/useCard'
import { cardsService } from '../../../app/services/cardsService'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { invalidateMoneyQueries } from '../../../app/utils/invalidateMoneyQueries'
import { usePayInvoice } from '../../components/PayInvoiceModal/usePayInvoice'

type CardDetailModal =
  | { name: 'edit' }
  | { name: 'delete' }
  | { name: 'newEntry' }
  | { name: 'editEntry', entry: CardEntry }
  | { name: 'editRecurring', recurringCharge: RecurringCharge }
  | { name: 'cancelRecurring', recurringCharge: RecurringCharge }

export type EntriesTab = 'list' | 'categories'

export function useCardDetailController() {
  const { cardId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openPayInvoice } = usePayInvoice()
  const { card, isInitialLoading, isError, error } = useCard(cardId)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [entriesTab, setEntriesTab] = useState<EntriesTab>('list')
  const [openModal, setOpenModal] = useState<CardDetailModal | null>(null)

  const { isLoading: isArchiving, mutateAsync: archiveCard } = useMutation(cardsService.archive)
  const { isLoading: isLoadingDelete, mutateAsync: removeCard } = useMutation(cardsService.remove)
  const { isLoading: isCancelling, mutateAsync: cancelRecurringCharge } = useMutation(cardsService.cancelRecurringCharge)

  // The invoice the API selects on opening (R44) stays selected while the
  // page is open, so paying it does not jump to another invoice.
  useEffect(() => {
    if (card && selectedMonth === null) setSelectedMonth(card.selectedMonth)
  }, [card, selectedMonth])

  useEffect(() => {
    if (!isError) return

    const { status } = getApiErrorPayload(error)
    toast.error(status === 404 || status === 400 ? 'Cartão não encontrado.' : 'Erro ao carregar o cartão.')
    navigate('/cartoes', { replace: true })
  }, [isError, error, navigate])

  // A month that left the strip after a change falls back to the API's pick.
  const selectedInvoice = card?.invoices.find(invoice => invoice.month === selectedMonth)
    ?? card?.invoices.find(invoice => invoice.month === card.selectedMonth)

  const isArchived = !!card?.archivedAt
  const closeModal = () => setOpenModal(null)

  function handlePay() {
    if (!card || !selectedInvoice) return

    openPayInvoice({
      cardId: card.id,
      cardName: card.name,
      month: selectedInvoice.month,
      balance: selectedInvoice.balance,
      lastPaymentBankAccountId: card.lastPaymentBankAccountId
    })
  }

  function handleSelectEntry(entry: CardEntry) {
    if (isArchived) return

    // A forecast is not an entry yet: its rule is edited in the recurring list.
    if (entry.isForecast) {
      document.getElementById('recurring-charges')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    setOpenModal({ name: 'editEntry', entry })
  }

  async function handleArchive() {
    try {
      await archiveCard(cardId)

      invalidateMoneyQueries(queryClient)
      toast.success('Cartão arquivado!')
    } catch (error) {
      const { status, owed } = getApiErrorPayload(error)

      toast.error(status === 409 && owed
        ? `O cartão ainda deve ${formatCurrency(owed)} e só pode ser arquivado sem dívida.`
        : 'Erro ao arquivar o cartão!')
    }
  }

  async function handleDelete() {
    try {
      await removeCard(cardId)

      invalidateMoneyQueries(queryClient)
      toast.success('Cartão excluído!')
      navigate('/cartoes', { replace: true })
    } catch (error) {
      toast.error(getApiErrorPayload(error).status === 409
        ? 'Um cartão com lançamentos ou pagamentos só pode ser arquivado.'
        : 'Erro ao excluir o cartão!')
      closeModal()
    }
  }

  async function handleCancelRecurring(recurringCharge: RecurringCharge) {
    try {
      await cancelRecurringCharge({ cardId, recurringChargeId: recurringCharge.id })

      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Recorrente cancelada!')
      closeModal()
    } catch {
      toast.error('Erro ao cancelar a recorrente!')
    }
  }

  return {
    card,
    isLoading: isInitialLoading,
    isArchived,
    selectedInvoice,
    selectMonth: setSelectedMonth,
    entriesTab,
    setEntriesTab,
    openModal,
    openEditModal: () => setOpenModal({ name: 'edit' }),
    openDeleteModal: () => setOpenModal({ name: 'delete' }),
    openNewEntryModal: () => setOpenModal({ name: 'newEntry' }),
    openEditRecurringModal: (recurringCharge: RecurringCharge) => setOpenModal({ name: 'editRecurring', recurringCharge }),
    openCancelRecurringModal: (recurringCharge: RecurringCharge) => setOpenModal({ name: 'cancelRecurring', recurringCharge }),
    closeModal,
    handlePay,
    handleSelectEntry,
    handleArchive,
    isArchiving,
    handleDelete,
    isLoadingDelete,
    handleCancelRecurring,
    isCancelling
  }
}
