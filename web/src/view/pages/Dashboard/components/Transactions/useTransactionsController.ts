import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useTransactions } from '../../../../../app/hooks/useTransactions'
import { TransactionsFilters } from '../../../../../app/services/transactionsService'

export function useTransactionsController() {
  const { areValuesVisible } = useDashboard()

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)
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
  function handleOpenFiltersModal() {
    setIsFiltersModalOpen(true)
  }

  function handleCloseFiltersModal() {
    setIsFiltersModalOpen(false)
  }

  return { filters, handleChangeFilters, areValuesVisible, isLoading, isInitialLoading, isFiltersModalOpen, handleOpenFiltersModal, handleCloseFiltersModal, transactions }
}