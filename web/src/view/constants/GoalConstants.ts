import { GoalStatus } from '../../app/entities/Goal'

export const GOAL_STATUS_TABS: { status: GoalStatus, label: string, emptyMessage: string }[] = [
  { status: 'IN_PROGRESS', label: 'Em andamento', emptyMessage: 'Nenhuma meta em andamento.' },
  { status: 'SCHEDULED', label: 'Agendadas', emptyMessage: 'Nenhuma meta agendada.' },
  { status: 'COMPLETED', label: 'Concluídas', emptyMessage: 'Nenhuma meta concluída.' },
  { status: 'ARCHIVED', label: 'Arquivadas', emptyMessage: 'Nenhuma meta arquivada.' }
]

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  IN_PROGRESS: 'Em andamento',
  SCHEDULED: 'Agendada',
  COMPLETED: 'Concluída',
  ARCHIVED: 'Arquivada'
}

export const GOAL_CHART_COLORS = {
  actual: '#087F5B',
  planned: '#7048E8',
  grid: '#DEE2E6',
  tick: '#868E96'
}

export const GOAL_CHART_AXIS = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 12, fill: GOAL_CHART_COLORS.tick }
}

export const GOAL_CHART_TOOLTIP = {
  contentStyle: { borderRadius: 16, border: 'none', boxShadow: '0px 11px 20px 0px rgba(0,0,0,0.10)' },
  labelStyle: { color: '#343A40', fontWeight: 500 },
  itemStyle: { color: '#495057' }
}
