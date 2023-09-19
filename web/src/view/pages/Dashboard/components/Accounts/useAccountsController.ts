import { useMemo, useState } from 'react'
import { useWindowWidth } from '../../../../../app/hooks/useWindowWidth'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useQuery } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccountsService'

export function useAccountsController() {
  const windowWidth = useWindowWidth()
  const { areValuesVisible, toggleValueVisibility, toggleCloseNewAccountModal } = useDashboard()

  const [sliderState, setSliderState] = useState({
    isBeginning: true,
    isEnd: false
  })

  const { data, isFetching } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: bankAccountsService.getAll
  })

  const currentBalance = useMemo(() => {
    if (!data) return 0

    return data.reduce((acc, curr) => acc + curr.currentBalance ,0)
  }, [data])

  return { currentBalance, accounts: data ?? [], isLoading: isFetching, toggleCloseNewAccountModal, sliderState, setSliderState, windowWidth, areValuesVisible, toggleValueVisibility }
}