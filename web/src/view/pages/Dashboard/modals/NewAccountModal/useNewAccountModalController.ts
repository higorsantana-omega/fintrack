import { useDashboard } from '../../components/DashboardContext/useDashboard'

export function useNewAccountModalController() {
  const {
    toggleCloseNewAccountModal,
    isNewAccountModalOpen
  } = useDashboard()

  return { toggleCloseNewAccountModal, isNewAccountModalOpen }
}