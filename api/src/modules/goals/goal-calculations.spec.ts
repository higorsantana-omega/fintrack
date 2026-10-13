import {
  GoalSnapshot,
  GoalTransaction,
  getEvolutionSeries,
  getGoalStatus,
  getGoalsSummary,
  getPendingMonths,
  getPeriodMonths,
  getResolvedMonths,
  getSavedByMonthSeries,
  getTotalSaved,
  getWithdrawalsByAccount,
} from './goal-calculations';
import {
  formatMonthKey,
  getDayInMonth as getDueDate,
  getMonthKey,
  getToday as getTodayInGoalsTimeZone,
  toCalendarDate as toGoalsCalendarDate,
} from 'src/shared/calendar';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const months = (keys: number[]) => keys.map(formatMonthKey);

let goalCounter = 0;

function makeGoal(overrides: Partial<GoalSnapshot> = {}): GoalSnapshot {
  goalCounter += 1;
  return {
    id: `goal-${goalCounter}`,
    targetAmount: 10000,
    monthlyContribution: 500,
    initialSaved: 0,
    contributionDay: 5,
    startDate: day('2027-01-01'),
    endDate: day('2027-12-31'),
    archivedAt: null,
    createdAt: new Date('2027-01-01T15:00:00.000Z'),
    transactions: [],
    skippedMonths: [],
    ...overrides,
  };
}

function contribution(
  goal: GoalSnapshot,
  date: string,
  value: number,
  overrides: Partial<GoalTransaction> = {},
): GoalTransaction {
  return {
    goalId: goal.id,
    bankAccountId: 'nubank',
    value,
    date: new Date(`${date}T12:00:00.000Z`),
    type: 'EXPENSE',
    ...overrides,
  };
}

function withTransactions(
  goal: GoalSnapshot,
  build: (goal: GoalSnapshot) => GoalTransaction[],
) {
  goal.transactions = build(goal);
  return goal;
}

describe('goal date helpers', () => {
  it('takes "today" from the São Paulo calendar day', () => {
    // 2027-03-05T02:00Z is still March 4th, 23h in Brasília
    expect(getTodayInGoalsTimeZone(new Date('2027-03-05T02:00:00Z'))).toEqual(
      day('2027-03-04'),
    );
  });

  it('converts incoming instants to the São Paulo calendar day', () => {
    expect(toGoalsCalendarDate(new Date('2027-04-01T00:30:00Z'))).toEqual(
      day('2027-03-31'),
    );
    expect(toGoalsCalendarDate(new Date('2026-10-12T01:30:00Z'))).toEqual(
      day('2026-10-11'),
    );
  });

  it('moves the due day to the last day of shorter months', () => {
    const february2027 = getMonthKey(day('2027-02-01'));
    const february2028 = getMonthKey(day('2028-02-01'));

    expect(getDueDate(february2027, 31)).toEqual(day('2027-02-28'));
    expect(getDueDate(february2028, 30)).toEqual(day('2028-02-29'));
    expect(getDueDate(getMonthKey(day('2027-04-01')), 31)).toEqual(
      day('2027-04-30'),
    );
  });
});

describe('getPeriodMonths', () => {
  it('includes every month whose adjusted due day falls inside the period (shared case with the web)', () => {
    const goal = makeGoal({
      contributionDay: 31,
      startDate: day('2027-02-15'),
      endDate: day('2027-04-30'),
    });

    expect(months(getPeriodMonths(goal))).toEqual([
      '2027-02',
      '2027-03',
      '2027-04',
    ]);
  });

  it('leaves out a first month whose due day is before the start and a last month whose due day is after the end', () => {
    const goal = makeGoal({
      contributionDay: 5,
      startDate: day('2027-01-20'),
      endDate: day('2027-12-03'),
    });

    const period = months(getPeriodMonths(goal));
    expect(period[0]).toBe('2027-02');
    expect(period[period.length - 1]).toBe('2027-11');
    expect(period).toHaveLength(10);
  });
});

describe('getPendingMonths', () => {
  it('AE2: lists every overdue month without a contribution', () => {
    const goal = withTransactions(
      makeGoal({
        startDate: day('2027-01-10'),
        createdAt: new Date('2027-01-10T15:00:00Z'),
      }),
      (goal) => [contribution(goal, '2027-02-05', 500)],
    );

    expect(months(getPendingMonths(goal, day('2027-05-10')))).toEqual([
      '2027-03',
      '2027-04',
      '2027-05',
    ]);
  });

  it('AE4: a day-31 goal is due on February 28th of a non-leap year', () => {
    const goal = makeGoal({
      contributionDay: 31,
      startDate: day('2027-02-01'),
      createdAt: new Date('2027-02-01T15:00:00Z'),
    });

    expect(months(getPendingMonths(goal, day('2027-02-28')))).toEqual([
      '2027-02',
    ]);
    expect(getPendingMonths(goal, day('2027-02-27'))).toEqual([]);
  });

  it('a day-30 goal is due on February 29th of a leap year', () => {
    const goal = makeGoal({
      contributionDay: 30,
      startDate: day('2028-02-01'),
      endDate: day('2028-12-31'),
      createdAt: new Date('2028-02-01T15:00:00Z'),
    });

    expect(months(getPendingMonths(goal, day('2028-02-29')))).toEqual([
      '2028-02',
    ]);
    expect(getPendingMonths(goal, day('2028-02-28'))).toEqual([]);
  });

  it('does not ask for months before the goal was created', () => {
    const goal = makeGoal({
      startDate: day('2026-09-01'),
      endDate: day('2027-12-31'),
      createdAt: new Date('2026-10-20T15:00:00Z'),
    });

    expect(months(getPendingMonths(goal, day('2026-10-20')))).toEqual([
      '2026-10',
    ]);
  });

  it('uses the São Paulo day of createdAt as the creation month', () => {
    // 2026-11-01T01:00Z is still October 31st in Brasília
    const goal = makeGoal({
      startDate: day('2026-09-01'),
      endDate: day('2027-12-31'),
      createdAt: new Date('2026-11-01T01:00:00Z'),
    });

    expect(months(getPendingMonths(goal, day('2026-11-10')))).toEqual([
      '2026-10',
      '2026-11',
    ]);
  });

  it('AE3: a contribution earlier in the month fulfils that month', () => {
    const goal = withTransactions(makeGoal({ contributionDay: 10 }), (goal) => [
      contribution(goal, '2027-01-10', 500),
      contribution(goal, '2027-02-10', 500),
      contribution(goal, '2027-03-03', 500),
    ]);

    expect(getPendingMonths(goal, day('2027-03-12'))).toEqual([]);
  });

  it('a "não aportei" mark resolves the month', () => {
    const goal = makeGoal({
      skippedMonths: [{ month: day('2027-01-01') }],
    });

    expect(getPendingMonths(goal, day('2027-01-20'))).toEqual([]);
    expect(months(getResolvedMonths(goal))).toEqual(['2027-01']);
  });

  it('a contribution dated outside the period counts in the total but resolves no month', () => {
    const goal = withTransactions(makeGoal(), (goal) => [
      contribution(goal, '2026-12-20', 300),
    ]);

    expect(getTotalSaved(goal)).toBe(300);
    expect(getResolvedMonths(goal)).toEqual([]);
  });

  it('AE10: a goal that drops back below the target asks again for the months it skipped', () => {
    const goal = withTransactions(makeGoal({ targetAmount: 3000 }), (goal) => [
      contribution(goal, '2027-01-05', 1000),
      contribution(goal, '2027-02-05', 1000),
      contribution(goal, '2027-03-05', 500),
      contribution(goal, '2027-03-20', 500),
    ]);
    expect(getGoalStatus(goal, day('2027-06-10')).status).toBe('COMPLETED');
    expect(getPendingMonths(goal, day('2027-06-10'))).toEqual([]);

    // the March 20th contribution is deleted on June 10th
    goal.transactions = goal.transactions.slice(0, 3);

    expect(getGoalStatus(goal, day('2027-06-10')).status).toBe('IN_PROGRESS');
    expect(months(getPendingMonths(goal, day('2027-06-10')))).toEqual([
      '2027-04',
      '2027-05',
      '2027-06',
    ]);
  });

  it('asks nothing for a goal that is not in progress', () => {
    const scheduled = makeGoal({ startDate: day('2027-06-01') });
    const archived = makeGoal({ archivedAt: new Date('2027-03-01T12:00Z') });
    const ended = makeGoal({ endDate: day('2027-03-31') });

    expect(getPendingMonths(scheduled, day('2027-05-10'))).toEqual([]);
    expect(getPendingMonths(archived, day('2027-05-10'))).toEqual([]);
    expect(getPendingMonths(ended, day('2027-05-10'))).toEqual([]);
  });
});

describe('getTotalSaved', () => {
  it('adds only linked contributions to the initial amount', () => {
    const goal = withTransactions(makeGoal({ initialSaved: 1000 }), (goal) => [
      contribution(goal, '2027-01-05', 500),
      contribution(goal, '2027-02-05', 800, { type: 'INCOME' }),
      contribution(goal, '2027-02-05', 900, { goalId: null }),
    ]);

    expect(getTotalSaved(goal)).toBe(1500);
  });

  it('adds 0.1 and 0.2 to exactly 0.30', () => {
    const goal = withTransactions(makeGoal(), (goal) => [
      contribution(goal, '2027-01-05', 0.1),
      contribution(goal, '2027-02-05', 0.2),
    ]);

    expect(getTotalSaved(goal)).toBe(0.3);
  });

  it('rounds each value to the nearest cent instead of truncating it', () => {
    const goal = withTransactions(makeGoal(), (goal) => [
      contribution(goal, '2027-01-05', 0.29),
      contribution(goal, '2027-02-05', 1.15),
    ]);

    expect(getTotalSaved(goal)).toBe(1.44);
  });
});

describe('getGoalStatus', () => {
  it('is scheduled while the start date is in the future', () => {
    const goal = makeGoal({ startDate: day('2027-06-01') });

    expect(getGoalStatus(goal, day('2027-05-31')).status).toBe('SCHEDULED');
    expect(getGoalStatus(goal, day('2027-06-01')).status).toBe('IN_PROGRESS');
  });

  it('follows the precedence archived, scheduled, completed, in progress', () => {
    const above = { initialSaved: 20000 };

    expect(
      getGoalStatus(
        makeGoal({ ...above, archivedAt: new Date('2027-02-01T12:00Z') }),
        day('2027-03-01'),
      ).status,
    ).toBe('ARCHIVED');
    expect(
      getGoalStatus(
        makeGoal({ ...above, startDate: day('2027-06-01') }),
        day('2027-03-01'),
      ).status,
    ).toBe('SCHEDULED');
    expect(getGoalStatus(makeGoal(above), day('2027-03-01'))).toEqual({
      status: 'COMPLETED',
      targetReached: true,
    });
  });

  it('AE6: completes below the target when the end date passes, and reopens when it is extended', () => {
    const goal = makeGoal({ initialSaved: 7000, endDate: day('2027-12-31') });

    expect(getGoalStatus(goal, day('2027-12-31')).status).toBe('IN_PROGRESS');
    expect(getGoalStatus(goal, day('2028-01-01'))).toEqual({
      status: 'COMPLETED',
      targetReached: false,
    });
    expect(getPendingMonths(goal, day('2028-01-10'))).toEqual([]);

    goal.endDate = day('2028-06-30');
    expect(getGoalStatus(goal, day('2028-01-01')).status).toBe('IN_PROGRESS');
  });

  it('AE5: a goal completed by the target reopens when a contribution is deleted', () => {
    const goal = withTransactions(
      makeGoal({ targetAmount: 1000, initialSaved: 500 }),
      (goal) => [contribution(goal, '2027-01-05', 500)],
    );
    expect(getGoalStatus(goal, day('2027-02-01')).status).toBe('COMPLETED');

    goal.transactions = [];

    expect(getGoalStatus(goal, day('2027-02-01')).status).toBe('IN_PROGRESS');
  });

  it('compares total and target in cents, so floating point noise still reaches the target', () => {
    const goal = makeGoal({ initialSaved: 9999.999999999 });

    expect(getGoalStatus(goal, day('2027-03-01'))).toEqual({
      status: 'COMPLETED',
      targetReached: true,
    });
  });
});

describe('getWithdrawalsByAccount', () => {
  it('AE7: returns the contributions of each account, without the initial amount', () => {
    const goal = withTransactions(makeGoal({ initialSaved: 1000 }), (goal) => [
      contribution(goal, '2027-01-05', 500),
      contribution(goal, '2027-02-05', 500),
      contribution(goal, '2027-03-05', 500),
    ]);

    expect(getWithdrawalsByAccount(goal)).toEqual([
      { bankAccountId: 'nubank', value: 1500 },
    ]);

    goal.transactions[1].bankAccountId = 'inter';

    expect(getWithdrawalsByAccount(goal)).toEqual([
      { bankAccountId: 'nubank', value: 1000 },
      { bankAccountId: 'inter', value: 500 },
    ]);
  });

  it('sums in cents', () => {
    const goal = withTransactions(makeGoal(), (goal) => [
      contribution(goal, '2027-01-05', 0.1),
      contribution(goal, '2027-02-05', 0.2),
      contribution(goal, '2027-03-05', 0.29, { bankAccountId: 'inter' }),
      contribution(goal, '2027-04-05', 1.15, { bankAccountId: 'inter' }),
    ]);

    expect(getWithdrawalsByAccount(goal)).toEqual([
      { bankAccountId: 'nubank', value: 0.3 },
      { bankAccountId: 'inter', value: 1.44 },
    ]);
  });

  it('ignores earlier withdrawals and unlinked transactions', () => {
    const goal = withTransactions(makeGoal(), (goal) => [
      contribution(goal, '2027-01-05', 500),
      contribution(goal, '2027-02-05', 500, { type: 'INCOME' }),
      contribution(goal, '2027-02-05', 700, { goalId: null }),
    ]);

    expect(getWithdrawalsByAccount(goal)).toEqual([
      { bankAccountId: 'nubank', value: 500 },
    ]);
  });
});

describe('getEvolutionSeries', () => {
  it('plans the initial amount plus the monthly contribution for each due month, and shows actual values up to the current month', () => {
    const goal = withTransactions(
      makeGoal({
        initialSaved: 1000,
        monthlyContribution: 500,
        startDate: day('2027-01-10'),
        endDate: day('2027-04-30'),
      }),
      (goal) => [
        contribution(goal, '2027-02-05', 500),
        contribution(goal, '2027-03-05', 300),
      ],
    );

    expect(getEvolutionSeries(goal, day('2027-03-15'))).toEqual([
      { month: '2027-01', planned: 1000, actual: 1000 },
      { month: '2027-02', planned: 1500, actual: 1500 },
      { month: '2027-03', planned: 2000, actual: 1800 },
      { month: '2027-04', planned: 2500, actual: null },
    ]);
  });
});

describe('getSavedByMonthSeries', () => {
  it('accumulates every non-archived goal and ends at the summary total', () => {
    const first = withTransactions(
      makeGoal({
        initialSaved: 1000,
        startDate: day('2027-02-01'),
        createdAt: new Date('2027-01-15T15:00:00Z'),
      }),
      (goal) => [
        contribution(goal, '2027-02-05', 500),
        contribution(goal, '2027-03-05', 500),
      ],
    );
    const second = withTransactions(
      makeGoal({ startDate: day('2027-03-01') }),
      (goal) => [contribution(goal, '2027-03-05', 200)],
    );
    const archived = withTransactions(
      makeGoal({
        initialSaved: 5000,
        archivedAt: new Date('2027-03-01T12:00:00Z'),
        startDate: day('2026-12-01'),
      }),
      (goal) => [contribution(goal, '2026-12-05', 900)],
    );
    const today = day('2027-04-10');

    const series = getSavedByMonthSeries([first, second, archived], today);

    expect(series).toEqual([
      { month: '2027-01', saved: 1000 },
      { month: '2027-02', saved: 1500 },
      { month: '2027-03', saved: 2200 },
      { month: '2027-04', saved: 2200 },
    ]);
    expect(series[series.length - 1].saved).toBe(
      getGoalsSummary([first, second, archived], today).totalSaved,
    );
  });

  it('is empty without non-archived goals', () => {
    expect(getSavedByMonthSeries([], day('2027-04-10'))).toEqual([]);
  });
});

describe('getGoalsSummary', () => {
  it('sums the monthly contribution of goals in progress and the total of non-archived goals', () => {
    const inProgress = makeGoal({
      monthlyContribution: 300,
      initialSaved: 100,
    });
    const scheduled = makeGoal({
      monthlyContribution: 700,
      initialSaved: 200,
      startDate: day('2027-09-01'),
    });
    const archived = makeGoal({
      monthlyContribution: 900,
      initialSaved: 400,
      archivedAt: new Date('2027-02-01T12:00Z'),
    });

    expect(
      getGoalsSummary([inProgress, scheduled, archived], day('2027-03-01')),
    ).toEqual({ monthlyContribution: 300, totalSaved: 300 });
  });
});
