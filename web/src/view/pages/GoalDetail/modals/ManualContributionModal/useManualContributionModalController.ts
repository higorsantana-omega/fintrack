import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GoalDetail } from '../../../../../app/entities/Goal'
import { goalsService } from '../../../../../app/services/goalsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

const schema = z.object({
  value: z.union([
    z.string().nonempty('Informe o valor'),
    z.number()
  ]).refine(value => currencyStringToNumber(value) > 0, 'Informe um valor maior que zero'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

export function useManualContributionModalController(goal: GoalDetail, onClose: () => void) {
  const {
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: goal.monthlyContribution,
      date: new Date()
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(goalsService.contribute)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        goalId: goal.id,
        value: currencyStringToNumber(data.value),
        date: data.date.toISOString()
      })

      invalidateMoneyQueries(queryClient)
      toast.success('Aporte registrado!')
      onClose()
    } catch {
      toast.error('Erro ao registrar o aporte!')
    }
  })

  return { control, errors, handleSubmit, isLoading }
}
