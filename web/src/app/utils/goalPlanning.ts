// Mirrors the "month in period" rule of api/src/modules/goals/goal-calculations.ts.
// Both sides are tested with the same cases: a January-December goal and a
// day-31 goal whose February contribution moves to the 28th.

const GOALS_TIME_ZONE = 'America/Sao_Paulo'

const calendarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: GOALS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

/** Calendar day of an instant in São Paulo, as a UTC-midnight date. */
export function toGoalsCalendarDate(instant: Date) {
  const parts = calendarFormatter.formatToParts(instant)
  const get = (type: string) =>
    Number(parts.find(part => part.type === type)?.value)

  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
}

/** The local day shown by a date picker, as a UTC-midnight calendar date. */
export function localDateToCalendarDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

export function getMonthKey(calendarDate: Date) {
  return calendarDate.getUTCFullYear() * 12 + calendarDate.getUTCMonth()
}

function formatMonthKey(monthKey: number) {
  const year = Math.floor(monthKey / 12)
  const month = (monthKey % 12) + 1

  return `${year}-${String(month).padStart(2, '0')}`
}

function getDueDate(monthKey: number, contributionDay: number) {
  const year = Math.floor(monthKey / 12)
  const month = monthKey % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return new Date(Date.UTC(year, month, Math.min(contributionDay, lastDay)))
}

/** Months whose due day (moved to the last day in shorter months) falls in the period. */
function getPeriodMonths(startDate: Date, endDate: Date, contributionDay: number) {
  const months: number[] = []

  for (let monthKey = getMonthKey(startDate); monthKey <= getMonthKey(endDate); monthKey++) {
    const dueDate = getDueDate(monthKey, contributionDay)

    if (dueDate >= startDate && dueDate <= endDate) {
      months.push(monthKey)
    }
  }

  return months
}

export interface GoalPlanningInput {
  targetAmount: number
  totalSaved: number
  monthlyContribution: number
  contributionDay: number
  startDate: Date
  endDate: Date
  creationMonth: number
  resolvedMonths: string[]
}

export interface GoalPlanning {
  remainingMonths: number
  suggestion: number | null
  projection: number
  missing: number
}

const toCents = (value: number) => Math.round(value * 100)

export function getGoalPlanning(input: GoalPlanningInput): GoalPlanning {
  const resolved = new Set(input.resolvedMonths)
  const remainingMonths = getPeriodMonths(input.startDate, input.endDate, input.contributionDay)
    .filter(monthKey => monthKey >= input.creationMonth && !resolved.has(formatMonthKey(monthKey)))
    .length

  const targetCents = toCents(input.targetAmount)
  const totalCents = toCents(input.totalSaved)
  const projectionCents = totalCents + toCents(input.monthlyContribution) * remainingMonths

  let suggestion: number | null = null
  if (totalCents >= targetCents) {
    suggestion = 0
  } else if (remainingMonths > 0) {
    suggestion = Math.ceil((targetCents - totalCents) / remainingMonths) / 100
  }

  return {
    remainingMonths,
    suggestion,
    projection: projectionCents / 100,
    missing: Math.max(0, targetCents - projectionCents) / 100
  }
}
