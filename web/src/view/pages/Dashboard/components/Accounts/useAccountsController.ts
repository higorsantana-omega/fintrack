import { useState } from 'react'
import { useWindowWidth } from '../../../../../app/hooks/useWindowWidth'
import { useDashboard } from '../DashboardContext/useDashboard'

export function useAccountsController() {
  const windowWidth = useWindowWidth()
  const { areValuesVisible, toggleValueVisibility, toggleCloseNewAccountModal } = useDashboard()

  const [sliderState, setSliderState] = useState({
    isBeginning: true,
    isEnd: false
  })

  return { toggleCloseNewAccountModal, sliderState, setSliderState, windowWidth, areValuesVisible, toggleValueVisibility, isLoading: false, accounts: [] }
}