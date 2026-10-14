import {
  REMINDER_DAYS_BEFORE_DUE,
  addDays,
} from 'src/modules/cards/card-calculations';
import {
  formatMonthKey,
  fromCents,
  getDayInMonth,
  getMonthKey,
  getMonthStart,
  toCents,
} from 'src/shared/calendar';
import {
  MAX_PAYMENT_NAME_RANGES,
  PAYMENT_NAME_INSTALLMENT,
  PAYMENT_NAME_INSTALLMENTS,
  PAYMENT_NAME_PAYOFF,
  PAYMENT_NAME_PREPAYMENT,
} from './debts.constants';

export type DebtStatus = 'IN_PROGRESS' | 'OVERDUE' | 'PAID';

export type InstallmentState = 'PAID_BEFORE_APP' | 'PAID' | 'OPEN' | 'OVERDUE';

export type InstallmentSnapshot = {
  number: number;
  /** First day of the month the installment falls in. */
  dueMonth: Date;
  expectedValue: number;
  paidBeforeApp: boolean;
  paymentTransactionId: string | null;
};

export type DebtSnapshot = {
  dueDay: number;
  /** All the rows of the debt, numbered 1 to N. */
  installments: InstallmentSnapshot[];
};

export type NewInstallmentRow = Pick<
  InstallmentSnapshot,
  'number' | 'dueMonth' | 'expectedValue' | 'paidBeforeApp'
>;

export type InstallmentsPlan = {
  installmentsCount: number;
  nextInstallment: number;
  /** Month key of the month the next installment falls in. */
  nextDueMonth: number;
  expectedValue: number;
};

export type DebtInstallment = InstallmentSnapshot & {
  dueDate: Date;
  state: InstallmentState;
};

export type DebtState = {
  installments: DebtInstallment[];
  openNumbers: number[];
  remaining: number;
  /** Month of the last open installment, as YYYY-MM. */
  endsIn: string | null;
  status: DebtStatus;
  /** Open installments due in 5 days or less, overdue ones included. */
  reminderNumbers: number[];
  shortcuts: {
    currentMonth: number[];
    overdueAndCurrentMonth: number[];
  };
};

export type BorrowerTransaction = {
  type: 'INCOME' | 'EXPENSE';
  value: number;
  bankAccountId: string;
};

export type BorrowerSnapshot = {
  previousBalance: number;
  /** Loans are expenses and returns are incomes. */
  transactions: BorrowerTransaction[];
};

export type DebtsSummary = {
  totalOwed: number;
  dueThisMonth: number;
  endsIn: string | null;
  owedByPeople: number;
};

export type AccountDeletionDebt = DebtSnapshot & {
  id: string;
  name: string;
  /** Every transaction linked to the debt, payments and the loan entry. */
  transactions: { id: string; bankAccountId: string }[];
};

export type AccountDeletionBorrower = BorrowerSnapshot & {
  id: string;
  name: string;
};

// Installments (KTD4) ----------------------------------------------------------

type RowPlan = Omit<InstallmentsPlan, 'expectedValue'>;

/** Installment n falls n - k months from the next one, k (R6). */
function getRows(
  plan: RowPlan,
  getValue: (number: number) => number,
): NewInstallmentRow[] {
  return Array.from({ length: plan.installmentsCount }, (_, index) => {
    const number = index + 1;

    return {
      number,
      dueMonth: getMonthStart(
        plan.nextDueMonth + number - plan.nextInstallment,
      ),
      expectedValue: getValue(number),
      paidBeforeApp: number < plan.nextInstallment,
    };
  });
}

export function getNewInstallmentRows(plan: InstallmentsPlan) {
  return getRows(plan, () => plan.expectedValue);
}

export function hasRegisteredPayment(installments: InstallmentSnapshot[]) {
  return installments.some(
    (installment) => installment.paymentTransactionId !== null,
  );
}

/**
 * The edit of R12 on a debt without payments: rows are matched by number.
 * Kept rows keep their value, new ones take the value of the last old row.
 */
export function getReconciliationPlan(
  installments: InstallmentSnapshot[],
  plan: RowPlan,
) {
  const valueByNumber = new Map(
    installments.map(({ number, expectedValue }) => [number, expectedValue]),
  );
  const lastValue = installments.reduce(
    (last, installment) =>
      installment.number > last.number ? installment : last,
    installments[0],
  ).expectedValue;
  const rows = getRows(
    plan,
    (number) => valueByNumber.get(number) ?? lastValue,
  );

  return {
    update: rows.filter(({ number }) => valueByNumber.has(number)),
    create: rows.filter(({ number }) => !valueByNumber.has(number)),
    removeNumbers: installments
      .map(({ number }) => number)
      .filter((number) => number > plan.installmentsCount)
      .sort((a, b) => a - b),
  };
}

// Dates and state (KTD2) ---------------------------------------------------------

/** The current due day of the debt, moved to the last day of shorter months (R9, R10). */
export function getInstallmentDueDate(dueDay: number, dueMonth: Date) {
  return getDayInMonth(getMonthKey(dueMonth), dueDay);
}

const isOpen = (installment: InstallmentSnapshot) =>
  !installment.paidBeforeApp && installment.paymentTransactionId === null;

function getInstallmentState(
  installment: InstallmentSnapshot,
  dueDate: Date,
  today: Date,
): InstallmentState {
  if (installment.paidBeforeApp) return 'PAID_BEFORE_APP';
  if (installment.paymentTransactionId !== null) return 'PAID';

  return dueDate < today ? 'OVERDUE' : 'OPEN';
}

export function getDebtState(debt: DebtSnapshot, today: Date): DebtState {
  const currentMonth = getMonthKey(today);
  const lastReminderDay = addDays(today, REMINDER_DAYS_BEFORE_DUE);
  const installments = [...debt.installments]
    .sort((a, b) => a.number - b.number)
    .map((installment) => {
      const dueDate = getInstallmentDueDate(debt.dueDay, installment.dueMonth);

      return {
        ...installment,
        dueDate,
        state: getInstallmentState(installment, dueDate, today),
      };
    });
  const open = installments.filter(isOpen);
  const numbersOf = (list: DebtInstallment[]) =>
    list.map(({ number }) => number);
  const inCurrentMonth = (installment: DebtInstallment) =>
    getMonthKey(installment.dueMonth) === currentMonth;
  const remainingCents = open.reduce(
    (sum, { expectedValue }) => sum + toCents(expectedValue),
    0,
  );
  const lastOpen = open[open.length - 1];

  return {
    installments,
    openNumbers: numbersOf(open),
    remaining: fromCents(remainingCents),
    endsIn: lastOpen ? formatMonthKey(getMonthKey(lastOpen.dueMonth)) : null,
    status:
      open.length === 0
        ? 'PAID'
        : open.some(({ state }) => state === 'OVERDUE')
        ? 'OVERDUE'
        : 'IN_PROGRESS',
    reminderNumbers: numbersOf(
      open.filter((i) => i.dueDate <= lastReminderDay),
    ),
    shortcuts: {
      currentMonth: numbersOf(open.filter(inCurrentMonth)),
      overdueAndCurrentMonth: numbersOf(
        open.filter((i) => i.state === 'OVERDUE' || inCurrentMonth(i)),
      ),
    },
  };
}

/** The N open installments with the highest numbers (R36), in ascending order. */
export function getLastOpenNumbers(
  installments: InstallmentSnapshot[],
  count: number,
) {
  return installments
    .filter(isOpen)
    .map(({ number }) => number)
    .sort((a, b) => b - a)
    .slice(0, count)
    .sort((a, b) => a - b);
}

// Payment name (KTD3) ----------------------------------------------------------

function toRanges(sortedNumbers: number[]) {
  const ranges: [number, number][] = [];

  sortedNumbers.forEach((number) => {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === number - 1) {
      last[1] = number;
    } else {
      ranges.push([number, number]);
    }
  });

  return ranges;
}

const formatRange = ([from, to]: [number, number]) =>
  from === to ? `${from}` : `${from}–${to}`;

/** Named after the paid set, not after the shortcut used; the first rule that fits wins. */
export function getPaymentName(
  debtName: string,
  installments: InstallmentSnapshot[],
  paidNumbers: number[],
  today: Date,
) {
  const paid = [...new Set(paidNumbers)].sort((a, b) => a - b);
  const total = installments.length;
  const open = installments.filter(isOpen);

  if (
    paid.length === open.length &&
    open.every(({ number }) => paid.includes(number))
  ) {
    return `${PAYMENT_NAME_PAYOFF}: ${debtName}`;
  }
  if (paid.length === 1) {
    return `${PAYMENT_NAME_INSTALLMENT} ${paid[0]}/${total}: ${debtName}`;
  }

  const ranges = toRanges(paid);
  const currentMonth = getMonthKey(today);
  const isPrepayment =
    ranges.length === 1 &&
    paid[paid.length - 1] === total &&
    installments
      .filter(({ number }) => paid.includes(number))
      .every(({ dueMonth }) => getMonthKey(dueMonth) > currentMonth);

  if (isPrepayment) {
    return `${PAYMENT_NAME_PREPAYMENT}: ${debtName} (${formatRange(
      ranges[0],
    )})`;
  }

  const shown = ranges.slice(0, MAX_PAYMENT_NAME_RANGES).map(formatRange);
  const hidden = ranges.length - shown.length;
  const list =
    hidden > 0 ? `${shown.join(', ')} e mais ${hidden}` : shown.join(', ');

  return `${PAYMENT_NAME_INSTALLMENTS} ${list}/${total}: ${debtName}`;
}

// People (KTD5) ----------------------------------------------------------------

function getBalanceCents(borrower: BorrowerSnapshot) {
  return borrower.transactions.reduce(
    (cents, { type, value }) =>
      cents + (type === 'EXPENSE' ? toCents(value) : -toCents(value)),
    toCents(borrower.previousBalance),
  );
}

/** Balance, the most a return can be (R28) and how much was returned over. */
export function getBorrowerBalance(borrower: BorrowerSnapshot) {
  const cents = getBalanceCents(borrower);

  return {
    balance: fromCents(cents),
    maxReturn: fromCents(Math.max(0, cents)),
    overpaid: fromCents(Math.max(0, -cents)),
  };
}

// Page summary (R2) --------------------------------------------------------------

export function getDebtsSummary(
  debts: DebtSnapshot[],
  borrowers: BorrowerSnapshot[],
  today: Date,
): DebtsSummary {
  let totalCents = 0;
  let dueCents = 0;
  let endsIn: string | null = null;

  debts.forEach((debt) => {
    const state = getDebtState(debt, today);
    const due = new Set(state.shortcuts.overdueAndCurrentMonth);

    totalCents += toCents(state.remaining);
    dueCents += state.installments
      .filter(({ number }) => due.has(number))
      .reduce((sum, { expectedValue }) => sum + toCents(expectedValue), 0);
    if (state.endsIn && (!endsIn || state.endsIn > endsIn)) {
      endsIn = state.endsIn;
    }
  });

  return {
    totalOwed: fromCents(totalCents),
    dueThisMonth: fromCents(dueCents),
    endsIn,
    owedByPeople: fromCents(
      borrowers.reduce(
        (sum, borrower) => sum + Math.max(0, getBalanceCents(borrower)),
        0,
      ),
    ),
  };
}

// Account deletion (KTD7) ----------------------------------------------------------

/**
 * What deleting the account changes: the installments its payments cover
 * reopen and the balance of each person with movements on it moves.
 */
export function getAccountDeletionImpact(
  bankAccountId: string,
  debts: AccountDeletionDebt[],
  borrowers: AccountDeletionBorrower[],
) {
  return {
    debts: debts
      .map((debt) => {
        const removedIds = new Set(
          debt.transactions
            .filter(
              (transaction) => transaction.bankAccountId === bankAccountId,
            )
            .map(({ id }) => id),
        );

        return {
          debtId: debt.id,
          name: debt.name,
          installments: debt.installments
            .filter(({ paymentTransactionId }) =>
              removedIds.has(paymentTransactionId),
            )
            .map(({ number }) => number)
            .sort((a, b) => a - b),
        };
      })
      .filter(({ installments }) => installments.length > 0),
    borrowers: borrowers
      .map((borrower) => {
        const kept = {
          ...borrower,
          transactions: borrower.transactions.filter(
            (transaction) => transaction.bankAccountId !== bankAccountId,
          ),
        };

        return {
          borrowerId: borrower.id,
          name: borrower.name,
          change: fromCents(getBalanceCents(kept) - getBalanceCents(borrower)),
        };
      })
      .filter(({ change }) => change !== 0),
  };
}
