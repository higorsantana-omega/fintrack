import { useDashboard } from '../../components/DashboardContext/useDashboard'

export function useNewTransactionModalController() {
  const {
    toggleCloseTransactionModal,
    newTransactionType,
    isNewTransactionModalOpen
  } = useDashboard()

  return { toggleCloseTransactionModal, isNewTransactionModalOpen, newTransactionType }
}
