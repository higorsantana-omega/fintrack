import { useContext } from 'react'
import { PurchaseLaunchContext } from './PurchaseLaunchContext'

export function usePurchaseLaunch() {
  return useContext(PurchaseLaunchContext)
}
