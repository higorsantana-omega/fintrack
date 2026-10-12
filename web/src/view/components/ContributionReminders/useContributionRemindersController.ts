import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { positiveCurrency } from '../../../app/utils/goalForm'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GoalReminder } from '../../../app/entities/Goal'
import { useGoalReminders } from '../../../app/hooks/useGoalReminders'
import { goalsService } from '../../../app/services/goalsService'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { invalidateMoneyQueries } from '../../../app/utils/invalidateMoneyQueries'

const schema = z.object({
  value: positiveCurrency('Informe o valor', 'Informe um valor maior que zero')
})

type FormData = z.infer<typeof schema>

type Answer = { action: 'CONFIRM', value: number } | { action: 'SKIP' }

export function useContributionRemindersController() {
  const queryClient = useQueryClient()
  const { refetch } = useGoalReminders()
  const [queue, setQueue] = useState<GoalReminder[]>([])
  const [isDismissed, setIsDismissed] = useState(false)
  const [pendingAction, setPendingAction] = useState<Answer['action'] | null>(null)

  const currentReminder = isDismissed ? undefined : queue[0]

  const {
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const { mutateAsync } = useMutation(goalsService.resolveReminder)

  // The queue is a snapshot taken once, when the private layout mounts.
  useEffect(() => {
    refetch().then(({ data }) => setQueue(data ?? []))
  }, [refetch])

  useEffect(() => {
    if (currentReminder) {
      reset({ value: currentReminder.monthlyContribution })
    }
  }, [currentReminder, reset])

  const answer = useCallback(async (reminder: GoalReminder, params: Answer) => {
    setPendingAction(params.action)

    try {
      await mutateAsync({ goalId: reminder.goalId, month: reminder.month, ...params })

      toast.success(params.action === 'CONFIRM' ? 'Aporte registrado!' : 'Mês marcado como não aportado.')
    } catch (error) {
      // 409: the month was already resolved elsewhere, so move on silently.
      if (getApiErrorPayload(error).status !== 409) {
        toast.error('Não foi possível registrar a resposta. Tente novamente.')
        setPendingAction(null)
        return
      }
    }

    invalidateMoneyQueries(queryClient)

    // A contribution may complete the goal and drop its later months.
    const result = await refetch()
    setQueue(previous => result.isError ? previous.slice(1) : result.data ?? [])
    setPendingAction(null)
  }, [mutateAsync, queryClient, refetch])

  const handleConfirm = hookFormSubmit(async data => {
    if (!currentReminder) return

    await answer(currentReminder, {
      action: 'CONFIRM',
      value: currencyStringToNumber(data.value)
    })
  })

  async function handleSkip() {
    if (!currentReminder) return

    await answer(currentReminder, { action: 'SKIP' })
  }

  function handleClose() {
    setIsDismissed(true)
  }

  return {
    currentReminder,
    control,
    errors,
    handleConfirm,
    handleSkip,
    handleClose,
    isConfirming: pendingAction === 'CONFIRM',
    isSkipping: pendingAction === 'SKIP',
    isAnswering: pendingAction !== null
  }
}
