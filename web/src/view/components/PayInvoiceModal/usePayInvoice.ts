import { useContext } from 'react'
import { PayInvoiceContext } from './PayInvoiceContext'

export function usePayInvoice() {
  return useContext(PayInvoiceContext)
}
