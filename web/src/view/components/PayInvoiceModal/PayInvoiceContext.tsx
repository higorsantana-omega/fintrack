import { createContext, useCallback, useState } from 'react'
import { PayInvoiceModal } from '.'

export interface PayInvoiceTarget {
  cardId: string
  cardName: string
  month: string
  balance: number
  lastPaymentBankAccountId: string | null
}

interface PayInvoiceCallbacks {
  onPaid?(): void
  onCancel?(): void
}

interface PayInvoiceContextValue {
  openPayInvoice(target: PayInvoiceTarget, callbacks?: PayInvoiceCallbacks): void
}

export const PayInvoiceContext = createContext({} as PayInvoiceContextValue)

// The banner and the reminder modal offer Pagar on every page, so the
// payment modal lives in the layout (KTD11).
export function PayInvoiceProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<{ target: PayInvoiceTarget, callbacks: PayInvoiceCallbacks } | null>(null)

  const openPayInvoice = useCallback((target: PayInvoiceTarget, callbacks: PayInvoiceCallbacks = {}) => {
    setRequest({ target, callbacks })
  }, [])

  function handleClose() {
    request?.callbacks.onCancel?.()
    setRequest(null)
  }

  function handlePaid() {
    request?.callbacks.onPaid?.()
    setRequest(null)
  }

  return (
    <PayInvoiceContext.Provider value={{ openPayInvoice }}>
      {children}

      {request && (
        <PayInvoiceModal
          key={`${request.target.cardId}-${request.target.month}`}
          target={request.target}
          onClose={handleClose}
          onPaid={handlePaid}
        />
      )}
    </PayInvoiceContext.Provider>
  )
}
