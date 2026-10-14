import { useState } from 'react'
import { useBorrowers } from '../../../app/hooks/useBorrowers'
import { useDebts } from '../../../app/hooks/useDebts'
import { useDebtsSummary } from '../../../app/hooks/useDebtsSummary'

export type DebtsTab = 'owe' | 'owed'

type DebtsModal = 'newDebt' | 'newBorrower'

export function useDebtsController() {
  const { debts, isInitialLoading: isLoadingDebts } = useDebts()
  const { borrowers, isInitialLoading: isLoadingBorrowers } = useBorrowers()
  const { summary, isInitialLoading: isLoadingSummary } = useDebtsSummary()
  const [tab, setTab] = useState<DebtsTab>('owe')
  const [openModal, setOpenModal] = useState<DebtsModal | null>(null)

  return {
    summary,
    isLoadingSummary,
    isLoadingDebts,
    isLoadingBorrowers,
    tab,
    selectTab: setTab,
    openDebts: debts.filter(debt => debt.status !== 'PAID'),
    paidDebts: debts.filter(debt => debt.status === 'PAID'),
    openBorrowers: borrowers.filter(borrower => borrower.balance > 0),
    settledBorrowers: borrowers.filter(borrower => borrower.balance <= 0),
    openModal,
    openNewDebtModal: () => setOpenModal('newDebt'),
    openNewBorrowerModal: () => setOpenModal('newBorrower'),
    closeModal: () => setOpenModal(null)
  }
}
