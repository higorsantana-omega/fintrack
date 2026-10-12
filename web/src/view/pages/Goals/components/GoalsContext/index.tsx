import { createContext, useCallback, useState } from 'react'

interface GoalsContextValue {
  isNewGoalModalOpen: boolean
  toggleCloseNewGoalModal(): void
}

export const GoalsContext = createContext({} as GoalsContextValue)

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false)

  const toggleCloseNewGoalModal = useCallback(() => {
    setIsNewGoalModalOpen(prevState => !prevState)
  }, [])

  return (
    <GoalsContext.Provider value={{
      isNewGoalModalOpen,
      toggleCloseNewGoalModal
    }}>
      {children}
    </GoalsContext.Provider>
  )
}
