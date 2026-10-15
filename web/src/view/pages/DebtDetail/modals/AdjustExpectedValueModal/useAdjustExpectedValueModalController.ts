import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { DebtInstallment } from '../../../../../app/entities/Debt'
import { debtsService } from '../../../../../app/services/debtsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'
import { positiveCurrency } from '../../../../../app/utils/goalForm'

const adjustExpectedValueSchema = z.object({
  value: positiveCurrency('Informe o novo valor', 'O valor deve ser maior que zero')
})

type AdjustExpectedValueFormData = z.infer<typeof adjustExpectedValueSchema>

export function useAdjustExpectedValueModalController(
  debtId: string,
  installment: DebtInstallment,
  onClose: () => void
) {
  const {
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<AdjustExpectedValueFormData>({
    resolver: zodResolver(adjustExpectedValueSchema),
    defaultValues: { value: installment.expectedValue }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(debtsService.updateExpectedValue)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        debtId,
        fromInstallment: installment.number,
        value: currencyStringToNumber(data.value)
      })

      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Valor ajustado!')
      onClose()
    } catch (error) {
      const { status, message } = getApiErrorPayload(error)

      toast.error(status === 409 && message ? message : 'Erro ao ajustar o valor!')
    }
  })

  return { errors, control, handleSubmit, isLoading }
}
