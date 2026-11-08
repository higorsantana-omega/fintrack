import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { Category, CategoryBudget, categoriesService } from '../../../../../app/services/categoriesService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'
import { positiveCurrency } from '../../../../../app/utils/goalForm'

const budgetSchema = z.object({
  amount: positiveCurrency('Informe o limite', 'O limite deve ser maior que zero')
})

type BudgetFormData = z.infer<typeof budgetSchema>

/** Whether a save sets the general limit or only the displayed month's. */
export type BudgetScope = 'ALL' | 'MONTH'

export function useCategoryBudgetModalController(
  category: Category,
  budget: CategoryBudget | null,
  month: string,
  onClose: () => void
) {
  const [scope, setScope] = useState<BudgetScope>(budget?.isAdjusted ? 'MONTH' : 'ALL')

  const {
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { amount: budget?.limit }
  })

  const queryClient = useQueryClient()
  const save = useMutation(categoriesService.setBudget)
  const remove = useMutation(categoriesService.removeBudget)

  async function run(action: () => Promise<unknown>, successMessage: string, errorMessage: string) {
    try {
      await action()

      queryClient.invalidateQueries({ queryKey: ['categories', 'summary'] })
      toast.success(successMessage)
      onClose()
    } catch (error) {
      toast.error(getApiErrorPayload(error).status === 400 ? 'Este limite não pode ser salvo.' : errorMessage)
    }
  }

  const handleSubmit = hookFormSubmit(data => run(
    () => save.mutateAsync({
      categoryId: category.id,
      amount: currencyStringToNumber(data.amount),
      month: budget && scope === 'MONTH' ? month : undefined
    }),
    'Limite salvo!',
    'Erro ao salvar o limite!'
  ))

  return {
    errors,
    control,
    scope,
    selectScope: setScope,
    handleSubmit,
    removeMonthOverride: () => run(
      () => remove.mutateAsync({ categoryId: category.id, month }),
      'Ajuste removido!',
      'Erro ao remover o ajuste!'
    ),
    removeBudget: () => run(
      () => remove.mutateAsync({ categoryId: category.id }),
      'Limite removido!',
      'Erro ao remover o limite!'
    ),
    isLoading: save.isLoading || remove.isLoading
  }
}
