import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { addYears } from 'date-fns'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { goalsService } from '../../../../../app/services/goalsService'
import { GoalFormData, goalFormSchema, toGoalParams } from '../../../../../app/utils/goalForm'
import { useGoalsPage } from '../../components/GoalsContext/useGoalsPage'

export function useNewGoalModalController() {
  const { isNewGoalModalOpen, toggleCloseNewGoalModal } = useGoalsPage()
  const { accounts } = useBankAccounts()
  const [createdAt] = useState(() => new Date())

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control,
    setValue,
    reset
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      targetAmount: '0,00',
      initialSaved: '0,00',
      monthlyContribution: '0,00',
      startDate: createdAt,
      endDate: addYears(createdAt, 1),
      bankAccountId: ''
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(goalsService.create)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync(toGoalParams(data))

      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Meta criada com sucesso!')
      toggleCloseNewGoalModal()
      reset()
    } catch {
      toast.error('Erro ao criar a meta!')
    }
  })

  return {
    isNewGoalModalOpen,
    toggleCloseNewGoalModal,
    accounts,
    createdAt,
    register,
    errors,
    control,
    setValue,
    handleSubmit,
    isLoading
  }
}
