export type GoalStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'

export interface Goal {
  id: string
  name: string
  targetAmount: number
  monthlyContribution: number
  initialSaved: number
  contributionDay: number
  startDate: string
  endDate: string
  archivedAt: string | null
  createdAt: string
  bankAccountId: string | null
  bankAccount: {
    id: string
    name: string
    color: string
  } | null
  totalSaved: number
  status: GoalStatus
  targetReached: boolean
}

export interface GoalHistoryItem {
  id: string
  kind: 'CONTRIBUTION' | 'WITHDRAWAL' | 'SKIPPED'
  date: string
  value: number | null
  bankAccount: {
    id: string
    name: string
  } | null
}

export interface GoalEvolutionPoint {
  month: string
  planned: number
  actual: number | null
}

export interface GoalDetail extends Goal {
  evolution: GoalEvolutionPoint[]
  resolvedMonths: string[]
  history: GoalHistoryItem[]
}

export interface GoalsSummary {
  monthlyContribution: number
  totalSaved: number
  savedByMonth: {
    month: string
    saved: number
  }[]
}

export interface GoalReminder {
  goalId: string
  goalName: string
  month: string
  dueDate: string
  monthlyContribution: number
  bankAccount: Goal['bankAccount']
}
