import { useContext } from 'react'
import { PayDebtContext } from './PayDebtContext'

export function usePayDebt() {
  return useContext(PayDebtContext)
}
