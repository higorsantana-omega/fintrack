import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GoalDetail } from '../../../../../app/entities/Goal'
import { goalsService } from '../../../../../app/services/goalsService'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

export function useArchiveGoalModalController(goal: GoalDetail, onClose: () => void) {
  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation(goalsService.archive)
  const [pendingChoice, setPendingChoice] = useState<'return' | 'keep' | null>(null)

  const hasContributions = goal.history.some(item => item.kind === 'CONTRIBUTION')

  async function archive(returnMoney: boolean) {
    setPendingChoice(returnMoney ? 'return' : 'keep')

    try {
      await mutateAsync({ goalId: goal.id, returnMoney })

      invalidateMoneyQueries(queryClient)
      toast.success(returnMoney ? 'Meta arquivada e dinheiro devolvido às contas.' : 'Meta arquivada.')
      onClose()
    } catch {
      toast.error('Erro ao arquivar a meta!')
    } finally {
      setPendingChoice(null)
    }
  }

  return {
    hasContributions,
    isReturning: pendingChoice === 'return',
    isKeeping: pendingChoice === 'keep',
    isArchiving: pendingChoice !== null,
    handleReturnMoney: () => archive(true),
    handleKeepMoney: () => archive(false)
  }
}
