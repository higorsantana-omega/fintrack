import { createContext, useCallback, useState } from 'react'
import { PayDebtModal } from '.'

export interface PayDebtTarget {
  debtId: string
  debtName: string
  /** Installments already marked when the modal opens. */
  initialNumbers?: number[]
}

interface PayDebtCallbacks {
  onPaid?(): void
  onCancel?(): void
}

interface PayDebtContextValue {
  openPayDebt(target: PayDebtTarget, callbacks?: PayDebtCallbacks): void
}

export const PayDebtContext = createContext({} as PayDebtContextValue)

// The banner, the reminder modal and the debt page offer Pagar, so the
// payment modal lives in the layout (KTD8).
export function PayDebtProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<{ target: PayDebtTarget, callbacks: PayDebtCallbacks } | null>(null)

  const openPayDebt = useCallback((target: PayDebtTarget, callbacks: PayDebtCallbacks = {}) => {
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
    <PayDebtContext.Provider value={{ openPayDebt }}>
      {children}

      {request && (
        <PayDebtModal
          key={request.target.debtId}
          target={request.target}
          onClose={handleClose}
          onPaid={handlePaid}
        />
      )}
    </PayDebtContext.Provider>
  )
}
