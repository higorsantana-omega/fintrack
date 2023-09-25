import { createContext, useCallback, useState } from 'react'
import { BankAccount } from '../../../../../app/entities/BankAccount'

interface DashboardContextValue {
  areValuesVisible: boolean
  isNewAccountModalOpen: boolean
  isNewTransactionModalOpen: boolean
  isEditAccountModalOpen: boolean
  accountBeingEdited: null | BankAccount
  newTransactionType: 'INCOME' | 'EXPENSE' | null
  toggleValueVisibility(): void
  toggleCloseNewAccountModal(): void
  toggleCloseTransactionModal(): void
  toggleOpenTransactionModal(type: 'INCOME' | 'EXPENSE' | null): void
  toggleOpenEditAccountModal(bankAccount?: BankAccount): void
}

export const DashboardContext = createContext({} as DashboardContextValue)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [areValuesVisible, setAreValuesVisible] = useState(true)
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false)
  const [isNewTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [newTransactionType, setNewTransactionType] = useState<'INCOME' | 'EXPENSE' | null>(null)
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(true)
  const [accountBeingEdited, setAccountBeingEdited] = useState<null | BankAccount>(null)

  const toggleValueVisibility = useCallback(() => {
    setAreValuesVisible(prevState => !prevState)
  }, [])

  const toggleCloseNewAccountModal = useCallback(() => {
    setIsNewAccountModalOpen(prevState => !prevState)
  }, [])

  const toggleCloseTransactionModal = useCallback(() => {
    setIsTransactionModalOpen(prevState => !prevState)
  }, [])

  const toggleOpenTransactionModal = useCallback((type: 'INCOME' | 'EXPENSE') => {
    setNewTransactionType(type)

    setIsTransactionModalOpen(prevState => !prevState)
  }, [])

  const toggleOpenEditAccountModal = useCallback((bankAccount: BankAccount) => {
    setIsEditAccountModalOpen(prevState => !prevState)

    setAccountBeingEdited(bankAccount || null)
  }, [])

  return (
    <DashboardContext.Provider value={{
      areValuesVisible,
      toggleValueVisibility,
      toggleCloseNewAccountModal,
      isNewAccountModalOpen,
      isNewTransactionModalOpen,
      toggleCloseTransactionModal,
      toggleOpenTransactionModal,
      newTransactionType,
      isEditAccountModalOpen,
      toggleOpenEditAccountModal,
      accountBeingEdited
    }}>
      {children}
    </DashboardContext.Provider>
  )
}