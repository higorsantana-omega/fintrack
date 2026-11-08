import { TransactionFormModal } from '../../../../components/TransactionFormModal'
import { useNewTransactionModalController } from './useTransactionModalController'

export function NewTransactionModal() {
  const {
    isNewTransactionModalOpen,
    toggleCloseTransactionModal,
    newTransactionType
  } = useNewTransactionModalController()

  // Mounted only while open, so every opening starts from a fresh form.
  if (!isNewTransactionModalOpen || !newTransactionType) return null

  return (
    <TransactionFormModal
      open
      type={newTransactionType}
      onClose={toggleCloseTransactionModal}
    />
  )
}
