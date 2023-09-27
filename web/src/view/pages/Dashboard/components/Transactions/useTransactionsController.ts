import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useTransactions } from '../../../../../app/hooks/useTransactions'
import { TransactionsFilters } from '../../../../../app/services/transactionsService'
import { Transaction } from '../../../../../app/entities/Transaction'

export function useTransactionsController() {
  const { areValuesVisible } = useDashboard()

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [transactionBeingEdited, setTransactionBeingEdited] = useState<null | Transaction>(null)

  const [filters, setFilters] = useState<TransactionsFilters>({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  })


  const { transactions, isLoading, isInitialLoading, refetch } = useTransactions(filters)

  useEffect(() => {
    refetch()
  }, [filters, refetch])

  function handleChangeFilters<TFilter extends keyof TransactionsFilters>(filter: TFilter) {
    return (value: TransactionsFilters[TFilter]) => {
      if (value === filters[filter]) {
        return
      }

      setFilters(prevState => ({ ...prevState, [filter]: value }))
    }
  }

  function handleApplyFilters (filters: { bankAccountId: string | undefined, year: number }) {
    const { 
      bankAccountId,
      year
    } = filters

    handleChangeFilters('bankAccountId')(bankAccountId)
    handleChangeFilters('year')(year)
    setIsFiltersModalOpen(false)
  }

  function handleOpenFiltersModal() {
    setIsFiltersModalOpen(true)
  }

  function handleCloseFiltersModal() {
    setIsFiltersModalOpen(false)
  }

  function handleOpenTransactionModal(transaction: Transaction) {
    setIsEditModalOpen(true)
    setTransactionBeingEdited(transaction)
  }

  function handleCloseTransactionModal() {
    setIsEditModalOpen(false)
    setTransactionBeingEdited(null)
  }

  return { handleOpenTransactionModal, handleCloseTransactionModal, isEditModalOpen, transactionBeingEdited, handleApplyFilters, filters, handleChangeFilters, areValuesVisible, isLoading, isInitialLoading, isFiltersModalOpen, handleOpenFiltersModal, handleCloseFiltersModal, transactions }
}