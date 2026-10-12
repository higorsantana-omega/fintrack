import { Goal } from '../entities/Goal'

/** Saved share of the target, as a whole percentage capped at 100. */
export function getGoalProgress(goal: Pick<Goal, 'totalSaved' | 'targetAmount'>) {
  return Math.min(100, Math.round((goal.totalSaved / goal.targetAmount) * 100))
}
