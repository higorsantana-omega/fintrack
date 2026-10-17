import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { debtsService } from '../../../../../app/services/debtsService'
import { DebtFormData, debtFormSchema, getCurrentMonth, toDebtParams } from '../../../../../app/utils/debtForm'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

export function useNewDebtModalController(onClose: () => void) {
  const { accounts } = useBankAccounts()

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<DebtFormData>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      name: '',
      installmentValue: '0,00',
      nextInstallment: 1,
      nextInstallmentMonth: getCurrentMonth(),
      hasEntry: false,
      entryBankAccountId: '',
      entryValue: '0,00'
    }
  })

  const hasEntry = useWatch({ control, name: 'hasEntry' })
  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(debtsService.create)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync(toDebtParams(data))

      if (data.hasEntry) {
        invalidateMoneyQueries(queryClient)
      } else {
        queryClient.invalidateQueries({ queryKey: ['debts'] })
      }
      toast.success('Dívida cadastrada com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao cadastrar a dívida!')
    }
  })

  return { register, errors, control, handleSubmit, isLoading, hasEntry, accounts }
}
