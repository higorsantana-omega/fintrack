import { createContext, useCallback, useState } from 'react'

interface DashboardContextValue {
  areValuesVisible: boolean
  isNewAccountModalOpen: boolean
  isNewTransactionModalOpen: boolean
  newTransactionType: 'INCOME' | 'EXPENSE' | null
  toggleValueVisibility(): void
  toggleCloseNewAccountModal(): void
  toggleCloseTransactionModal(): void
  toggleOpenTransactionModal(type: 'INCOME' | 'EXPENSE' | null): void
}

export const DashboardContext = createContext({} as DashboardContextValue)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [areValuesVisible, setAreValuesVisible] = useState(true)
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false)
  const [isNewTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [newTransactionType, setNewTransactionType] = useState<'INCOME' | 'EXPENSE' | null>(null)

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

  return (
    <DashboardContext.Provider value={{
      areValuesVisible,
      toggleValueVisibility,
      toggleCloseNewAccountModal,
      isNewAccountModalOpen,
      isNewTransactionModalOpen,
      toggleCloseTransactionModal,
      toggleOpenTransactionModal,
      newTransactionType
    }}>
      {children}
    </DashboardContext.Provider>
  )
}