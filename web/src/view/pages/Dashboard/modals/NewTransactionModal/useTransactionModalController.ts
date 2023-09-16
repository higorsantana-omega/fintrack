import { useDashboard } from '../../components/DashboardContext/useDashboard'

export function useNewTransactionModalController() {
  const {
    toggleCloseTransactionModal,
    newTransactionType,
    isNewTransactionModalOpen,
    toggleOpenTransactionModal
  } = useDashboard()

  return { toggleCloseTransactionModal, isNewTransactionModalOpen, newTransactionType, toggleOpenTransactionModal }
}