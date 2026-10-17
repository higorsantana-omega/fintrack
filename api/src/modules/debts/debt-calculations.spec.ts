import { parseMonthKey } from 'src/shared/calendar';
import {
  BorrowerSnapshot,
  DebtSnapshot,
  InstallmentSnapshot,
  getAccountDeletionImpact,
  getBorrowerBalance,
  getDebtState,
  getDebtsSummary,
  getInstallmentDueDate,
  getLastOpenNumbers,
  getNewInstallmentRows,
  getPaymentName,
  getReconciliationPlan,
  hasRegisteredPayment,
} from './debt-calculations';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const m = (value: string) => parseMonthKey(value);

// Today in the examples; the Carro is 48 x R$ 1.200 due on the 10th.
const today = day('2026-10-13');

type DebtOptions = {
  dueDay?: number;
  count?: number;
  next?: number;
  nextMonth?: string;
  value?: number;
  /** Numbers paid by a transaction, besides the ones before the app. */
  paid?: number[];
};

function makeInstallments({
  count = 48,
  next = 19,
  nextMonth = '2026-11',
  value = 1200,
  paid = [],
}: DebtOptions = {}): InstallmentSnapshot[] {
  return getNewInstallmentRows({
    installmentsCount: count,
    nextInstallment: next,
    nextDueMonth: m(nextMonth),
    expectedValue: value,
  }).map((row) => ({
    ...row,
    paymentTransactionId: paid.includes(row.number) ? `tx-${row.number}` : null,
  }));
}

const makeDebt = (options: DebtOptions = {}): DebtSnapshot => ({
  dueDay: options.dueDay ?? 10,
  installments: makeInstallments(options),
});

const numbers = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

describe('getNewInstallmentRows', () => {
  it('AE1: marks the installments before the next one as paid before the app', () => {
    const rows = getNewInstallmentRows({
      installmentsCount: 48,
      nextInstallment: 19,
      nextDueMonth: m('2026-11'),
      expectedValue: 1200,
    });

    expect(rows).toHaveLength(48);
    expect(
      rows.filter((row) => row.paidBeforeApp).map((row) => row.number),
    ).toEqual(numbers(1, 18));
    expect(rows[18]).toEqual({
      number: 19,
      dueMonth: day('2026-11-01'),
      expectedValue: 1200,
      paidBeforeApp: false,
    });
    expect(rows[47].dueMonth).toEqual(day('2029-04-01'));
    expect(rows[0].dueMonth).toEqual(day('2025-05-01'));
  });

  it('AE1: owes R$ 36.000 and ends in April 2029', () => {
    const state = getDebtState(makeDebt(), today);

    expect(state.remaining).toBe(36000);
    expect(state.endsIn).toBe('2029-04');
    expect(state.openNumbers).toEqual(numbers(19, 48));
  });
});

describe('getInstallmentDueDate', () => {
  it('AE12: moves day 31 to the last day of shorter months', () => {
    expect(getInstallmentDueDate(31, day('2027-02-01'))).toEqual(
      day('2027-02-28'),
    );
    expect(getInstallmentDueDate(31, day('2028-02-01'))).toEqual(
      day('2028-02-29'),
    );
    expect(getInstallmentDueDate(31, day('2027-04-01'))).toEqual(
      day('2027-04-30'),
    );
  });

  it('AE15: a reopened installment follows the current due day', () => {
    const debt: DebtSnapshot = { ...makeDebt({ paid: [19] }), dueDay: 10 };
    expect(getDebtState(debt, today).installments[18].dueDate).toEqual(
      day('2026-11-10'),
    );

    const changed = {
      ...debt,
      dueDay: 15,
      installments: debt.installments.map((installment) => ({
        ...installment,
        paymentTransactionId: null,
      })),
    };
    const reopened = getDebtState(changed, today).installments[18];

    expect(reopened.state).toBe('OPEN');
    expect(reopened.dueDate).toEqual(day('2026-11-15'));
  });
});

describe('getDebtState', () => {
  const carro = (extraPaid: number[]) =>
    makeDebt({ next: 19, paid: extraPaid });

  it('AE2: is overdue on 15/12 and offers the overdue plus current month set', () => {
    const state = getDebtState(carro([]), day('2026-12-15'));

    expect(state.status).toBe('OVERDUE');
    expect(state.shortcuts.overdueAndCurrentMonth).toEqual([19, 20]);
    expect(state.shortcuts.currentMonth).toEqual([20]);
  });

  it('AE2: paying 19 and 20 leaves R$ 33.600 in progress', () => {
    const state = getDebtState(carro([19, 20]), day('2026-12-15'));

    expect(state.remaining).toBe(33600);
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.shortcuts.overdueAndCurrentMonth).toEqual([]);
  });

  it('AE3: paying 46 to 48 moves the end to January 2029 and R$ 30.000', () => {
    const debt = makeDebt({
      next: 21,
      nextMonth: '2027-01',
      paid: [46, 47, 48],
    });
    const state = getDebtState(debt, day('2027-01-05'));

    expect(state.remaining).toBe(30000);
    expect(state.endsIn).toBe('2029-01');
  });

  it('AE4: paying everything open settles the debt', () => {
    const debt = makeDebt({
      next: 21,
      nextMonth: '2027-01',
      paid: numbers(21, 48),
    });
    const state = getDebtState(debt, day('2027-01-05'));

    expect(state.status).toBe('PAID');
    expect(state.remaining).toBe(0);
    expect(state.endsIn).toBeNull();
    expect(state.openNumbers).toEqual([]);
    expect(state.reminderNumbers).toEqual([]);
  });

  it('AE5: changing the value from installment 25 drops R$ 1.008.000 to R$ 991.200', () => {
    const base = makeInstallments({
      count: 360,
      next: 25,
      nextMonth: '2026-11',
      value: 3000,
    });
    const debt = { dueDay: 10, installments: base };
    expect(getDebtState(debt, today).remaining).toBe(1008000);

    const repriced = {
      dueDay: 10,
      installments: base.map((installment) =>
        installment.number >= 25
          ? { ...installment, expectedValue: 2950 }
          : installment,
      ),
    };
    const state = getDebtState(repriced, today);

    expect(state.remaining).toBe(991200);
    expect(
      repriced.installments
        .filter((installment) => installment.paidBeforeApp)
        .every((installment) => installment.expectedValue === 3000),
    ).toBe(true);
  });

  it('AE14: a January installment is a reminder on 29/12 but not the current month', () => {
    const debt = makeDebt({
      dueDay: 2,
      next: 1,
      nextMonth: '2027-01',
      count: 12,
    });
    const state = getDebtState(debt, day('2026-12-29'));

    expect(state.reminderNumbers).toEqual([1]);
    expect(state.shortcuts.currentMonth).toEqual([]);
    expect(state.shortcuts.overdueAndCurrentMonth).toEqual([]);
  });

  it('AE18: the last 3 open skip a paid installment', () => {
    const debt = makeDebt({ next: 21, nextMonth: '2027-01', paid: [47] });

    expect(getLastOpenNumbers(debt.installments, 3)).toEqual([45, 46, 48]);
  });

  it('AE18: the current month shortcut is empty when the month is paid', () => {
    const debt = makeDebt({ next: 19, paid: [19] });
    const state = getDebtState(debt, day('2026-11-20'));

    expect(state.shortcuts.currentMonth).toEqual([]);
  });

  it('is in progress and a reminder when due today', () => {
    const state = getDebtState(
      makeDebt({ dueDay: 13, next: 13, nextMonth: '2026-10' }),
      today,
    );

    expect(state.status).toBe('IN_PROGRESS');
    expect(state.reminderNumbers).toContain(13);
  });

  it('is overdue when due yesterday', () => {
    const state = getDebtState(
      makeDebt({ dueDay: 12, next: 13, nextMonth: '2026-10' }),
      today,
    );

    expect(state.status).toBe('OVERDUE');
    expect(state.installments[12].state).toBe('OVERDUE');
  });

  it('reminds 5 days ahead but not 6', () => {
    const inFiveDays = getDebtState(
      makeDebt({ dueDay: 18, next: 13, nextMonth: '2026-10' }),
      today,
    );
    const inSixDays = getDebtState(
      makeDebt({ dueDay: 19, next: 13, nextMonth: '2026-10' }),
      today,
    );

    expect(inFiveDays.reminderNumbers).toEqual([13]);
    expect(inSixDays.reminderNumbers).toEqual([]);
  });

  it('reports the state of each installment', () => {
    const state = getDebtState(makeDebt({ paid: [19] }), day('2026-12-15'));
    const stateOf = (number: number) => state.installments[number - 1].state;

    expect(stateOf(1)).toBe('PAID_BEFORE_APP');
    expect(stateOf(19)).toBe('PAID');
    expect(stateOf(20)).toBe('OVERDUE');
    expect(stateOf(21)).toBe('OPEN');
  });

  it('sums R$ 0,10 and R$ 0,20 installments to exactly R$ 0,30', () => {
    const debt: DebtSnapshot = {
      dueDay: 10,
      installments: [
        {
          number: 1,
          dueMonth: day('2026-11-01'),
          expectedValue: 0.1,
          paidBeforeApp: false,
          paymentTransactionId: null,
        },
        {
          number: 2,
          dueMonth: day('2026-12-01'),
          expectedValue: 0.2,
          paidBeforeApp: false,
          paymentTransactionId: null,
        },
      ],
    };

    expect(getDebtState(debt, today).remaining).toBe(0.3);
  });
});

describe('getLastOpenNumbers', () => {
  it('takes the N open installments with the highest numbers, in order', () => {
    const { installments } = makeDebt({ next: 21, nextMonth: '2027-01' });

    expect(getLastOpenNumbers(installments, 3)).toEqual([46, 47, 48]);
    expect(getLastOpenNumbers(installments, 1)).toEqual([48]);
    expect(getLastOpenNumbers(installments, 28)).toEqual(numbers(21, 48));
  });
});

describe('getPaymentName', () => {
  const carro = makeInstallments({ next: 19, nextMonth: '2026-11' });
  const name = (paid: number[], installments = carro, now = today) =>
    getPaymentName('Carro', installments, paid, now);

  it('AE4: paying everything open is a payoff', () => {
    expect(name(numbers(19, 48))).toBe('Quitação: Carro');
  });

  it('names one installment', () => {
    expect(name([19])).toBe('Parcela 19/48: Carro');
  });

  it('names a range', () => {
    expect(name([19, 20])).toBe('Parcelas 19–20/48: Carro');
  });

  it('names a range ending at the last installment, only in future months, as a prepayment', () => {
    expect(name([46, 47, 48])).toBe('Antecipação: Carro (46–48)');
  });

  it('names a range ending at the last installment as a plain range when a month is not future', () => {
    const late = makeInstallments({
      count: 12,
      next: 9,
      nextMonth: '2026-09',
    });

    expect(name([10, 11, 12], late)).toBe('Parcelas 10–12/12: Carro');
  });

  it('names a scattered set with its ranges', () => {
    expect(name([19, 20, 25])).toBe('Parcelas 19–20, 25/48: Carro');
  });

  it('shows three ranges and summarises the rest', () => {
    expect(name([19, 21, 23, 25, 27])).toBe(
      'Parcelas 19, 21, 23 e mais 2/48: Carro',
    );
  });
});

describe('getReconciliationPlan', () => {
  it('AE16: grows from 48 to 50 keeping R$ 1.100 from installment 30', () => {
    const installments = makeInstallments({
      next: 1,
      nextMonth: '2026-11',
    }).map((installment) =>
      installment.number >= 30
        ? { ...installment, expectedValue: 1100 }
        : installment,
    );
    const plan = getReconciliationPlan(installments, {
      installmentsCount: 50,
      nextInstallment: 1,
      nextDueMonth: m('2026-11'),
    });

    expect(plan.create.map((row) => [row.number, row.expectedValue])).toEqual([
      [49, 1100],
      [50, 1100],
    ]);
    expect(plan.create[1].dueMonth).toEqual(day('2030-12-01'));
    expect(plan.update.find((row) => row.number === 30).expectedValue).toBe(
      1100,
    );
    expect(plan.update.find((row) => row.number === 29).expectedValue).toBe(
      1200,
    );
    expect(plan.removeNumbers).toEqual([]);
  });

  it('AE16: shrinks from 50 to 46 removing installments 47 to 50', () => {
    const installments = makeInstallments({
      count: 50,
      next: 1,
      nextMonth: '2026-11',
    });
    const plan = getReconciliationPlan(installments, {
      installmentsCount: 46,
      nextInstallment: 1,
      nextDueMonth: m('2026-11'),
    });

    expect(plan.removeNumbers).toEqual([47, 48, 49, 50]);
    expect(plan.update).toHaveLength(46);
    expect(plan.create).toEqual([]);
  });

  it('AE16: moving the next installment from 19 to 20 marks 19 as paid before the app', () => {
    const installments = makeInstallments({ next: 19, nextMonth: '2026-11' });
    const plan = getReconciliationPlan(installments, {
      installmentsCount: 48,
      nextInstallment: 20,
      nextDueMonth: m('2026-11'),
    });
    const row = (number: number) =>
      plan.update.find((r) => r.number === number);

    expect(row(19).paidBeforeApp).toBe(true);
    expect(row(20).paidBeforeApp).toBe(false);
    expect(row(20).dueMonth).toEqual(day('2026-11-01'));
    expect(row(48).dueMonth).toEqual(day('2029-03-01'));
  });

  it('detects a registered payment', () => {
    expect(hasRegisteredPayment(makeInstallments())).toBe(false);
    expect(hasRegisteredPayment(makeInstallments({ paid: [30] }))).toBe(true);
  });
});

describe('getDebtsSummary', () => {
  const borrower = (openingBalance: number): BorrowerSnapshot => ({
    openingBalance,
    transactions: [],
  });

  it('sums what is owed, what is due this month and the furthest end', () => {
    const carro = makeDebt({ next: 12, nextMonth: '2026-10', paid: [] });
    const moto = makeDebt({
      dueDay: 20,
      count: 12,
      next: 3,
      nextMonth: '2026-09',
      value: 500,
    });
    const summary = getDebtsSummary([carro, moto], [], today);

    // Moto: installments 3 to 12 (Sep 2026 to Jun 2027) => 10 x 500; Sep is overdue.
    expect(summary.totalOwed).toBe(37 * 1200 + 10 * 500);
    expect(summary.dueThisMonth).toBe(1200 + 500 + 500);
    expect(summary.endsIn).toBe('2029-10');
  });

  it('has no end month without an open debt', () => {
    const settled = makeDebt({ paid: numbers(19, 48) });
    const summary = getDebtsSummary([settled], [], today);

    expect(summary.endsIn).toBeNull();
    expect(summary.totalOwed).toBe(0);
  });

  it('adds only positive balances to what people owe', () => {
    const summary = getDebtsSummary(
      [],
      [borrower(1500), borrower(-200), borrower(300.1)],
      today,
    );

    expect(summary.owedByPeople).toBe(1800.1);
  });
});

describe('getBorrowerBalance', () => {
  const tx = (
    type: 'INCOME' | 'EXPENSE',
    value: number,
  ): BorrowerSnapshot['transactions'][number] => ({
    type,
    value,
    bankAccountId: 'inter',
  });

  it('AE8: previous balance plus loans minus returns', () => {
    const joao: BorrowerSnapshot = {
      openingBalance: 1500,
      transactions: [tx('EXPENSE', 500), tx('INCOME', 300)],
    };

    expect(getBorrowerBalance(joao)).toEqual({
      balance: 1700,
      maxReturn: 1700,
      overpaid: 0,
    });
  });

  it('AE9: a return without its loan leaves a negative balance', () => {
    const joao: BorrowerSnapshot = {
      openingBalance: 0,
      transactions: [tx('INCOME', 500)],
    };

    expect(getBorrowerBalance(joao)).toEqual({
      balance: -500,
      maxReturn: 0,
      overpaid: 500,
    });

    joao.transactions.push(tx('EXPENSE', 800));
    expect(getBorrowerBalance(joao).balance).toBe(300);
  });

  it('sums cents exactly', () => {
    const joao: BorrowerSnapshot = {
      openingBalance: 0,
      transactions: [tx('EXPENSE', 0.1), tx('EXPENSE', 0.2)],
    };

    expect(getBorrowerBalance(joao).balance).toBe(0.3);
  });
});

describe('getAccountDeletionImpact', () => {
  const itau = 'itau';
  const carro = {
    id: 'carro',
    name: 'Carro',
    ...makeDebt({ paid: [19, 20, 21] }),
    transactions: [
      { id: 'tx-19', bankAccountId: itau },
      { id: 'tx-20', bankAccountId: itau },
      { id: 'tx-21', bankAccountId: 'inter' },
      { id: 'entry', bankAccountId: itau },
    ],
  };
  const joao = {
    id: 'joao',
    name: 'João',
    openingBalance: 1500,
    transactions: [
      { type: 'EXPENSE' as const, value: 500, bankAccountId: 'inter' },
      { type: 'INCOME' as const, value: 300, bankAccountId: itau },
    ],
  };

  it('AE11: warns of installments 19 and 20 and R$ 300 more for João', () => {
    const impact = getAccountDeletionImpact(itau, [carro], [joao]);

    expect(impact.debts).toEqual([
      { debtId: 'carro', name: 'Carro', installments: [19, 20] },
    ]);
    expect(impact.borrowers).toEqual([
      { borrowerId: 'joao', name: 'João', change: 300 },
    ]);
  });

  it('AE11: the loan entry of a debt gives no warning', () => {
    const impact = getAccountDeletionImpact(
      itau,
      [{ ...carro, ...makeDebt(), transactions: carro.transactions }],
      [],
    );

    expect(impact).toEqual({ debts: [], borrowers: [] });
  });

  it('lowers a balance when a loan on the account goes away', () => {
    const impact = getAccountDeletionImpact('inter', [], [joao]);

    expect(impact.borrowers).toEqual([
      { borrowerId: 'joao', name: 'João', change: -500 },
    ]);
  });
});
