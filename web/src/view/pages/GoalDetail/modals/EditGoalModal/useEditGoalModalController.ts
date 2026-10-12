import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GoalDetail } from '../../../../../app/entities/Goal'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { goalsService } from '../../../../../app/services/goalsService'
import { GoalFormData, calendarDateToLocal, goalFormSchema, toGoalParams } from '../../../../../app/utils/goalForm'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

export function useEditGoalModalController(goal: GoalDetail, onClose: () => void) {
  const { accounts } = useBankAccounts()

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control,
    setValue
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: goal.name,
      targetAmount: goal.targetAmount,
      initialSaved: goal.initialSaved,
      monthlyContribution: goal.monthlyContribution,
      contributionDay: goal.contributionDay,
      startDate: calendarDateToLocal(goal.startDate),
      endDate: calendarDateToLocal(goal.endDate),
      bankAccountId: goal.bankAccountId ?? ''
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(goalsService.update)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({ ...toGoalParams(data), id: goal.id })

      invalidateMoneyQueries(queryClient)
      toast.success('Meta editada com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao editar a meta!')
    }
  })

  return {
    accounts,
    register,
    errors,
    control,
    setValue,
    handleSubmit,
    isLoading,
    contributionsTotal: goal.totalSaved - goal.initialSaved,
    createdAt: new Date(goal.createdAt)
  }
}
