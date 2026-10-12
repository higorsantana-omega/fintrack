import { useMemo, useState } from 'react'
import { GoalStatus } from '../../../app/entities/Goal'
import { useGoals } from '../../../app/hooks/useGoals'
import { useGoalsSummary } from '../../../app/hooks/useGoalsSummary'
import { useGoalsPage } from './components/GoalsContext/useGoalsPage'

export function useGoalsController() {
  const { toggleCloseNewGoalModal } = useGoalsPage()
  const { goals, isInitialLoading: isLoadingGoals } = useGoals()
  const { summary, isInitialLoading: isLoadingSummary } = useGoalsSummary()
  const [activeStatus, setActiveStatus] = useState<GoalStatus>('IN_PROGRESS')

  const goalsByStatus = useMemo(() => {
    return goals.reduce<Record<GoalStatus, typeof goals>>((groups, goal) => {
      groups[goal.status].push(goal)
      return groups
    }, { IN_PROGRESS: [], SCHEDULED: [], COMPLETED: [], ARCHIVED: [] })
  }, [goals])

  return {
    summary,
    isLoadingSummary,
    isLoadingGoals,
    goalsByStatus,
    activeStatus,
    setActiveStatus,
    toggleCloseNewGoalModal
  }
}
