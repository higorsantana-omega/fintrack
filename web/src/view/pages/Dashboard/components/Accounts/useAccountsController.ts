import { useMemo, useState } from 'react'
import { useWindowWidth } from '../../../../../app/hooks/useWindowWidth'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'

export function useAccountsController() {
  const windowWidth = useWindowWidth()
  const { areValuesVisible, toggleValueVisibility, toggleCloseNewAccountModal } = useDashboard()

  const [sliderState, setSliderState] = useState({
    isBeginning: true,
    isEnd: false
  })

  const { accounts, isFetching } = useBankAccounts()

  const currentBalance = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + curr.currentBalance ,0)
  }, [accounts])

  return { currentBalance, accounts, isLoading: isFetching, toggleCloseNewAccountModal, sliderState, setSliderState, windowWidth, areValuesVisible, toggleValueVisibility }
}