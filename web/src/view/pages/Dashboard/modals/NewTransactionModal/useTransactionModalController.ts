import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '../../../../../app/services/transactionsService'
import toast from 'react-hot-toast'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'

const schema = z.object({
  value: z.string().nonempty('Informe o valor'),
  name: z.string().nonempty('Informe o nome'),
  categoryId: z.string().nonempty('Informe a categoria'),
  bankAccountId: z.string().nonempty('Informe a conta'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

export function useNewTransactionModalController() {
  const {
    toggleCloseTransactionModal,
    newTransactionType,
    isNewTransactionModalOpen,
    toggleOpenTransactionModal
  } = useDashboard()

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const queryClient = useQueryClient()
  const { accounts } = useBankAccounts()
  const { categories: categoriesList } = useCategories()
  const {
    isLoading,
    mutateAsync
  } = useMutation(transactionsService.create)
  
  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        ...data,
        value: currencyStringToNumber(data.value),
        type: newTransactionType!,
        date: data.date.toISOString()
      })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })

      toast.success(
        newTransactionType === 'EXPENSE'
          ? 'Despesa cadastrada com sucesso!'
          : 'Receita cadastrada com sucesso!'
      )
      toggleCloseTransactionModal()
      reset()
    } catch {
      toast.error(
        newTransactionType === 'EXPENSE'
          ? 'Erro ao cadastrar despesa!'
          : 'Erro ao cadastrar receita!'
      )
    }
  })

  const categories = useMemo(() => {
    return categoriesList.filter(category => category.type === newTransactionType)
  }, [categoriesList, newTransactionType])

  return { isLoading, mutateAsync, accounts, categories, handleSubmit, register, errors, control, reset, toggleCloseTransactionModal, isNewTransactionModalOpen, newTransactionType, toggleOpenTransactionModal }
}