import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useGoal } from '../../../app/hooks/useGoal'
import { goalsService } from '../../../app/services/goalsService'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { getGoalPlanning, getMonthKey, toGoalsCalendarDate } from '../../../app/utils/goalPlanning'

type GoalDetailModal = 'edit' | 'contribution' | 'archive' | 'delete'

export function useGoalDetailController() {
  const { goalId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { goal, isInitialLoading, isError, error } = useGoal(goalId)
  const [openModal, setOpenModal] = useState<GoalDetailModal | null>(null)
  const { isLoading: isLoadingDelete, mutateAsync: removeGoal } = useMutation(goalsService.remove)

  useEffect(() => {
    if (!isError) return

    const { status } = getApiErrorPayload(error)
    toast.error(status === 404 || status === 400 ? 'Meta não encontrada.' : 'Erro ao carregar a meta.')
    navigate('/metas', { replace: true })
  }, [isError, error, navigate])

  const planning = useMemo(() => {
    if (!goal) return null

    return getGoalPlanning({
      targetAmount: goal.targetAmount,
      totalSaved: goal.totalSaved,
      monthlyContribution: goal.monthlyContribution,
      contributionDay: goal.contributionDay,
      startDate: new Date(goal.startDate),
      endDate: new Date(goal.endDate),
      creationMonth: getMonthKey(toGoalsCalendarDate(new Date(goal.createdAt))),
      resolvedMonths: goal.resolvedMonths
    })
  }, [goal])

  const isArchived = goal?.status === 'ARCHIVED'
  const hasContributions = goal?.history.some(item => item.kind === 'CONTRIBUTION') ?? false

  async function handleDeleteGoal() {
    try {
      await removeGoal(goalId)

      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Meta excluída com sucesso!')
      navigate('/metas', { replace: true })
    } catch {
      toast.error('Erro ao excluir a meta!')
    }
  }

  return {
    goal,
    isLoading: isInitialLoading,
    planning,
    openModal,
    openEditModal: () => setOpenModal('edit'),
    openContributionModal: () => setOpenModal('contribution'),
    openArchiveModal: () => setOpenModal('archive'),
    openDeleteModal: () => setOpenModal('delete'),
    closeModal: () => setOpenModal(null),
    canEdit: !!goal && !isArchived,
    canArchive: !!goal && !isArchived,
    canContribute: goal?.status === 'IN_PROGRESS',
    canDelete: !!goal && !isArchived && !hasContributions,
    isLoadingDelete,
    handleDeleteGoal
  }
}
