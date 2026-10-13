import {
  formatMonthKey,
  fromCents,
  getDayInMonth,
  getMonthKey,
  toCalendarDate,
  toCents,
} from 'src/shared/calendar';

export type GoalStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type GoalTransaction = {
  goalId: string | null;
  bankAccountId: string;
  value: number;
  date: Date;
  type: 'INCOME' | 'EXPENSE';
};

export type GoalSnapshot = {
  id: string;
  targetAmount: number;
  monthlyContribution: number;
  initialSaved: number;
  contributionDay: number;
  startDate: Date;
  endDate: Date;
  archivedAt: Date | null;
  createdAt: Date;
  transactions: GoalTransaction[];
  skippedMonths: { month: Date }[];
};

export type EvolutionPoint = {
  month: string;
  planned: number;
  actual: number | null;
};

export type SavedByMonthPoint = { month: string; saved: number };

export type Withdrawal = { bankAccountId: string; value: number };

export function getCreationMonth(goal: Pick<GoalSnapshot, 'createdAt'>) {
  return getMonthKey(toCalendarDate(goal.createdAt));
}

/** Months whose due day falls between the start and end dates, inclusive. */
export function getPeriodMonths(
  goal: Pick<GoalSnapshot, 'startDate' | 'endDate' | 'contributionDay'>,
) {
  const months: number[] = [];

  for (
    let monthKey = getMonthKey(goal.startDate);
    monthKey <= getMonthKey(goal.endDate);
    monthKey++
  ) {
    const dueDate = getDayInMonth(monthKey, goal.contributionDay);

    if (dueDate >= goal.startDate && dueDate <= goal.endDate) {
      months.push(monthKey);
    }
  }

  return months;
}

function getContributions(goal: GoalSnapshot) {
  return goal.transactions.filter(
    (transaction) =>
      transaction.goalId === goal.id && transaction.type === 'EXPENSE',
  );
}

function getTotalSavedInCents(goal: GoalSnapshot) {
  return getContributions(goal).reduce(
    (total, contribution) => total + toCents(contribution.value),
    toCents(goal.initialSaved),
  );
}

export function getTotalSaved(goal: GoalSnapshot) {
  return fromCents(getTotalSavedInCents(goal));
}

export function getGoalStatus(
  goal: GoalSnapshot,
  today: Date,
): { status: GoalStatus; targetReached: boolean } {
  const targetReached =
    getTotalSavedInCents(goal) >= toCents(goal.targetAmount);

  if (goal.archivedAt) return { status: 'ARCHIVED', targetReached };
  if (today < goal.startDate) return { status: 'SCHEDULED', targetReached };
  if (targetReached || today > goal.endDate) {
    return { status: 'COMPLETED', targetReached };
  }

  return { status: 'IN_PROGRESS', targetReached };
}

/** Period months that already have a contribution or a "não aportei" mark. */
export function getResolvedMonths(goal: GoalSnapshot) {
  const resolved = new Set([
    ...getContributions(goal).map((contribution) =>
      getMonthKey(contribution.date),
    ),
    ...goal.skippedMonths.map((skipped) => getMonthKey(skipped.month)),
  ]);

  return getPeriodMonths(goal).filter((monthKey) => resolved.has(monthKey));
}

export function getPendingMonths(goal: GoalSnapshot, today: Date) {
  if (getGoalStatus(goal, today).status !== 'IN_PROGRESS') return [];

  const creationMonth = getCreationMonth(goal);
  const resolved = new Set(getResolvedMonths(goal));

  return getPeriodMonths(goal).filter(
    (monthKey) =>
      monthKey >= creationMonth &&
      !resolved.has(monthKey) &&
      today >= getDayInMonth(monthKey, goal.contributionDay),
  );
}

export function getEvolutionSeries(
  goal: GoalSnapshot,
  today: Date,
): EvolutionPoint[] {
  const currentMonth = getMonthKey(today);
  const periodMonths = getPeriodMonths(goal);
  const contributions = getContributions(goal)
    .map((contribution) => ({
      monthKey: getMonthKey(contribution.date),
      cents: toCents(contribution.value),
    }))
    .sort((a, b) => a.monthKey - b.monthKey);
  const series: EvolutionPoint[] = [];

  // Both lists are sorted by month, so each is consumed once while walking.
  let dueMonths = 0;
  let nextContribution = 0;
  let actualCents = toCents(goal.initialSaved);

  for (
    let monthKey = getMonthKey(goal.startDate);
    monthKey <= getMonthKey(goal.endDate);
    monthKey++
  ) {
    while (
      dueMonths < periodMonths.length &&
      periodMonths[dueMonths] <= monthKey
    ) {
      dueMonths++;
    }
    while (
      nextContribution < contributions.length &&
      contributions[nextContribution].monthKey <= monthKey
    ) {
      actualCents += contributions[nextContribution].cents;
      nextContribution++;
    }

    const plannedCents =
      toCents(goal.initialSaved) +
      toCents(goal.monthlyContribution) * dueMonths;

    series.push({
      month: formatMonthKey(monthKey),
      planned: fromCents(plannedCents),
      actual: monthKey <= currentMonth ? fromCents(actualCents) : null,
    });
  }

  return series;
}

/** Saved total accumulated month by month across non-archived goals. */
export function getSavedByMonthSeries(
  goals: GoalSnapshot[],
  today: Date,
): SavedByMonthPoint[] {
  const centsByMonth = new Map<number, number>();
  const add = (monthKey: number, cents: number) =>
    centsByMonth.set(monthKey, (centsByMonth.get(monthKey) ?? 0) + cents);

  goals
    .filter((goal) => !goal.archivedAt)
    .forEach((goal) => {
      add(
        Math.min(getMonthKey(goal.startDate), getCreationMonth(goal)),
        toCents(goal.initialSaved),
      );
      getContributions(goal).forEach((contribution) =>
        add(getMonthKey(contribution.date), toCents(contribution.value)),
      );
    });

  if (centsByMonth.size === 0) return [];

  const months = [...centsByMonth.keys()];
  const lastMonth = Math.max(getMonthKey(today), ...months);
  const series: SavedByMonthPoint[] = [];
  let accumulated = 0;

  for (let monthKey = Math.min(...months); monthKey <= lastMonth; monthKey++) {
    accumulated += centsByMonth.get(monthKey) ?? 0;
    series.push({
      month: formatMonthKey(monthKey),
      saved: fromCents(accumulated),
    });
  }

  return series;
}

export function getGoalsSummary(goals: GoalSnapshot[], today: Date) {
  let monthlyContributionCents = 0;
  let totalSavedCents = 0;

  goals.forEach((goal) => {
    if (goal.archivedAt) return;

    totalSavedCents += getTotalSavedInCents(goal);
    if (getGoalStatus(goal, today).status === 'IN_PROGRESS') {
      monthlyContributionCents += toCents(goal.monthlyContribution);
    }
  });

  return {
    monthlyContribution: fromCents(monthlyContributionCents),
    totalSaved: fromCents(totalSavedCents),
  };
}

/** Contributions grouped by the account they came from, for the withdrawal. */
export function getWithdrawalsByAccount(goal: GoalSnapshot): Withdrawal[] {
  const centsByAccount = new Map<string, number>();

  getContributions(goal).forEach((contribution) =>
    centsByAccount.set(
      contribution.bankAccountId,
      (centsByAccount.get(contribution.bankAccountId) ?? 0) +
        toCents(contribution.value),
    ),
  );

  return [...centsByAccount].map(([bankAccountId, cents]) => ({
    bankAccountId,
    value: fromCents(cents),
  }));
}
