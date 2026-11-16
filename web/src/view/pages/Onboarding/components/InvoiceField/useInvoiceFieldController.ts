import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CardInvoice } from '../../../../../app/entities/CreditCard'
import { cardsService } from '../../../../../app/services/cardsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { useOnboarding } from '../OnboardingContext/useOnboarding'

const toFieldValue = (balance: number) => balance.toFixed(2).replace('.', ',')

interface InvoiceFieldControllerParams {
  cardId: string
  invoice: CardInvoice
  correctionId: string
}

export function useInvoiceFieldController({ cardId, invoice, correctionId }: InvoiceFieldControllerParams) {
  const queryClient = useQueryClient()
  const onboarding = useOnboarding()
  const [value, setValue] = useState(toFieldValue(invoice.balance))
  const [isSaving, setIsSaving] = useState(false)
  const { mutateAsync, reset, isLoading, isSuccess, isError } = useMutation(cardsService.setOpeningAdjustment)
  const id = `invoice-${invoice.month}-${cardId}`
  const isCorrection = onboarding.correctionId === correctionId

  useEffect(() => {
    setValue(toFieldValue(invoice.balance))
  }, [invoice.balance])

  useEffect(() => {
    if (isCorrection) document.getElementById(id)?.focus()
  }, [isCorrection, id])

  function handleChange(newValue: string) {
    setValue(newValue)
    reset()
  }

  async function save() {
    // One save per invoice at a time: two overlapping PUTs could both create an adjustment.
    if (isSaving) return

    const remaining = currencyStringToNumber(value)

    if (value === '' || remaining === invoice.balance) {
      setValue(toFieldValue(invoice.balance))
      return
    }

    setIsSaving(true)
    try {
      try {
        await mutateAsync({ cardId, month: invoice.month, remaining })
      } catch {
        setValue(toFieldValue(invoice.balance))
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['cards'] })
    } finally {
      setIsSaving(false)
    }

    if (isCorrection) onboarding.goTo('REVIEW')
  }

  return { id, value, handleChange, save, isSaving, isLoading, isSuccess, isError }
}
