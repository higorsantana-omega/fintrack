import {
  formatMonthKey,
  fromCents,
  getDayInMonth,
  getMonthKey,
  toCents,
} from 'src/shared/calendar';

export type InvoiceStatus = 'FUTURE' | 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE';

export type CardCycle = {
  closingDay: number;
  dueDay: number;
  /** First day of the first due month this version applies to. */
  effectiveFrom: Date;
};

export type CardPurchaseSnapshot = {
  kind: 'PURCHASE' | 'REFUND';
  installments: { invoiceMonth: Date; value: number }[];
};

export type CardPayment = {
  cardInvoiceMonth: Date | null;
  value: number;
  type: 'INCOME' | 'EXPENSE';
  bankAccountId: string;
};

export type RecurringChargeRule = {
  id: string;
  value: number;
  firstChargeDate: Date;
  materializedThrough: Date;
  cancelledAt: Date | null;
};

export type CardSnapshot = {
  id: string;
  limit: number;
  archivedAt: Date | null;
  cycles: CardCycle[];
  purchases: CardPurchaseSnapshot[];
  payments: CardPayment[];
  recurringCharges: RecurringChargeRule[];
};

export type InvoiceDates = {
  closingDate: Date;
  dueDate: Date;
  /** Closing date of the previous invoice: the first day of this period. */
  periodStart: Date;
};

export type Invoice = InvoiceDates & {
  month: number;
  charges: number;
  refunds: number;
  creditIn: number;
  total: number;
  paid: number;
  balance: number;
  creditOut: number;
  forecast: number;
  status: InvoiceStatus;
};

export type Forecast = {
  recurringChargeId: string;
  date: Date;
  invoiceMonth: number;
  value: number;
};

export type CardSeriesPoint = {
  month: string;
  total: number;
  forecast: number;
  balance: number;
  credit: number;
  value: number;
  status: InvoiceStatus;
  isFuture: boolean;
};

export type CardsSeriesPoint = Omit<CardSeriesPoint, 'balance' | 'status'>;

export const SERIES_MONTHS_AROUND = 6;
export const REMINDER_DAYS_BEFORE_DUE = 5;

// Invoices are walked month by month from the oldest entry, so purchase and
// payment dates stay within this many months of today.
export const MAX_DATE_DISTANCE_MONTHS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);

// Dates (KTD3) ---------------------------------------------------------------

function sortCycles(cycles: CardCycle[]) {
  return [...cycles].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
  );
}

/** The latest version starting on or before the month; the first one before it. */
export function getCycleForMonth(cycles: CardCycle[], monthKey: number) {
  const sorted = sortCycles(cycles);

  return (
    sorted
      .filter((cycle) => getMonthKey(cycle.effectiveFrom) <= monthKey)
      .pop() ?? sorted[0]
  );
}

/** Steps 2 to 4 of KTD3: one version's due and closing dates for a month. */
function getVersionDates(
  cycle: Pick<CardCycle, 'closingDay' | 'dueDay'>,
  monthKey: number,
) {
  const dueDate = getDayInMonth(monthKey, cycle.dueDay);
  const closingMonth =
    cycle.closingDay < cycle.dueDay ? monthKey : monthKey - 1;
  const closingDate = getDayInMonth(closingMonth, cycle.closingDay);

  return {
    dueDate,
    closingDate: closingDate >= dueDate ? addDays(dueDate, -1) : closingDate,
  };
}

/**
 * Step 5 of KTD3: a closing that does not land after the previous month's
 * closing moves to the day after it. Within one version closings always
 * grow, so only months from the second version on need the comparison.
 */
function getClosingDate(cycles: CardCycle[], monthKey: number): Date {
  const secondVersion = sortCycles(cycles)[1];
  const { closingDate } = getVersionDates(
    getCycleForMonth(cycles, monthKey),
    monthKey,
  );

  if (!secondVersion || monthKey < getMonthKey(secondVersion.effectiveFrom)) {
    return closingDate;
  }

  const previous = getClosingDate(cycles, monthKey - 1);

  return closingDate > previous ? closingDate : addDays(previous, 1);
}

export function getInvoiceDates(
  cycles: CardCycle[],
  monthKey: number,
): InvoiceDates {
  return {
    closingDate: getClosingDate(cycles, monthKey),
    dueDate: getVersionDates(getCycleForMonth(cycles, monthKey), monthKey)
      .dueDate,
    periodStart: getClosingDate(cycles, monthKey - 1),
  };
}

export function isWithinDateWindow(calendarDay: Date, today: Date) {
  return (
    Math.abs(getMonthKey(calendarDay) - getMonthKey(today)) <=
    MAX_DATE_DISTANCE_MONTHS
  );
}

/** Due month of the first invoice closing strictly after the day (R6). */
export function getInvoiceMonth(cycles: CardCycle[], calendarDay: Date) {
  let monthKey = getMonthKey(calendarDay);

  while (getClosingDate(cycles, monthKey) <= calendarDay) monthKey++;
  while (getClosingDate(cycles, monthKey - 1) > calendarDay) monthKey--;

  return monthKey;
}

/** A new card's first version starts at the last invoice closed on that day. */
export function getFirstCycleMonth(
  cycle: Pick<CardCycle, 'closingDay' | 'dueDay'>,
  today: Date,
) {
  return getInvoiceMonth([{ ...cycle, effectiveFrom: today }], today) - 1;
}

/**
 * Month a change of days starts in (R2): the open invoice when its new
 * closing is still ahead of today and of its period start, else the next one.
 */
export function getCycleChangeMonth(
  cycles: CardCycle[],
  newCycle: Pick<CardCycle, 'closingDay' | 'dueDay'>,
  today: Date,
) {
  const openMonth = getInvoiceMonth(cycles, today);
  const { closingDate } = getVersionDates(newCycle, openMonth);
  const { periodStart } = getInvoiceDates(cycles, openMonth);

  return closingDate > today && closingDate > periodStart
    ? openMonth
    : openMonth + 1;
}

// Installments (KTD5) --------------------------------------------------------

/** Equal installments in cents, with the leftover cents in the first one (R16). */
export function splitInstallmentValues(totalValue: number, count: number) {
  const totalCents = toCents(totalValue);
  const baseCents = Math.floor(totalCents / count);
  const leftover = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) =>
    fromCents(index === 0 ? baseCents + leftover : baseCents),
  );
}

export type InstallmentPlan = {
  totalValue: number;
  installmentsCount: number;
  currentInstallment: number;
  purchaseDay: Date;
  /** Due month of the invoice holding the current installment (R18 only). */
  anchorInvoiceMonth: number | null;
};

/**
 * Installment n of a new purchase falls n - 1 months after the invoice of the
 * purchase date (R17). With an anchor, only the current installment onward is
 * created, starting at the anchor (R18).
 */
export function getInstallments(plan: InstallmentPlan, cycles: CardCycle[]) {
  const values = splitInstallmentValues(
    plan.totalValue,
    plan.installmentsCount,
  );
  const firstNumber =
    plan.anchorInvoiceMonth === null ? 1 : plan.currentInstallment;
  const firstMonth =
    plan.anchorInvoiceMonth ?? getInvoiceMonth(cycles, plan.purchaseDay);

  return values
    .map((value, index) => ({ number: index + 1, value }))
    .filter(({ number }) => number >= firstNumber)
    .map(({ number, value }) => ({
      number,
      value,
      invoiceMonth: firstMonth + number - firstNumber,
    }));
}

// Recurring charges (KTD6) ---------------------------------------------------

/** Charge dates after `after` and up to `through`, before the cancellation. */
export function getChargeDates(
  rule: Pick<RecurringChargeRule, 'firstChargeDate' | 'cancelledAt'>,
  after: Date,
  through: Date,
) {
  const chargeDay = rule.firstChargeDate.getUTCDate();
  const lastMonth = getMonthKey(through);
  const dates: Date[] = [];

  // Months before the one of `after` only hold dates before it.
  for (
    let monthKey = Math.max(
      getMonthKey(rule.firstChargeDate),
      getMonthKey(after),
    );
    monthKey <= lastMonth;
    monthKey++
  ) {
    const date = getDayInMonth(monthKey, chargeDay);

    if (
      date >= rule.firstChargeDate &&
      date > after &&
      date <= through &&
      (!rule.cancelledAt || date < rule.cancelledAt)
    ) {
      dates.push(date);
    }
  }

  return dates;
}

export function getChargesToMaterialize(
  rule: RecurringChargeRule,
  today: Date,
) {
  return getChargeDates(rule, rule.materializedThrough, today);
}

/** Charges not yet turned into purchases whose invoice is due up to the month. */
export function getForecasts(
  card: CardSnapshot,
  today: Date,
  throughMonth: number,
): Forecast[] {
  if (card.archivedAt) return [];

  const lastDay = addDays(getClosingDate(card.cycles, throughMonth), -1);

  return card.recurringCharges.flatMap((rule) => {
    const after =
      rule.materializedThrough > today ? rule.materializedThrough : today;

    return getChargeDates(rule, after, lastDay).map((date) => ({
      recurringChargeId: rule.id,
      date,
      invoiceMonth: getInvoiceMonth(card.cycles, date),
      value: rule.value,
    }));
  });
}

// Invoices (KTD2) ------------------------------------------------------------

function getInvoiceStatus(
  dates: InvoiceDates,
  balanceCents: number,
  today: Date,
): InvoiceStatus {
  if (today < dates.periodStart) return 'FUTURE';
  if (today < dates.closingDate) return 'OPEN';
  if (balanceCents <= 0) return 'PAID';

  return today <= dates.dueDate ? 'CLOSED' : 'OVERDUE';
}

type MonthTotals = { charges: number; refunds: number; paid: number };

function getTotalsByMonth(
  card: CardSnapshot,
  isRemovedPayment: (payment: CardPayment) => boolean,
) {
  const totals = new Map<number, MonthTotals>();
  const at = (monthKey: number) => {
    if (!totals.has(monthKey)) {
      totals.set(monthKey, { charges: 0, refunds: 0, paid: 0 });
    }
    return totals.get(monthKey);
  };

  card.purchases.forEach((purchase) =>
    purchase.installments.forEach((installment) => {
      const month = at(getMonthKey(installment.invoiceMonth));
      if (purchase.kind === 'REFUND') {
        month.refunds += toCents(installment.value);
      } else {
        month.charges += toCents(installment.value);
      }
    }),
  );

  card.payments
    .filter(
      (payment) =>
        payment.type === 'EXPENSE' &&
        payment.cardInvoiceMonth &&
        !isRemovedPayment(payment),
    )
    .forEach((payment) => {
      at(getMonthKey(payment.cardInvoiceMonth)).paid += toCents(payment.value);
    });

  return totals;
}

export type InvoiceRange = {
  /** Negative infinity starts at the first month with entries or payments. */
  fromMonth: number;
  toMonth: number;
  /** Payments left out of the calculation, for the account deletion (KTD9). */
  isRemovedPayment?: (payment: CardPayment) => boolean;
};

/**
 * Walks the months in order, carrying the credit of each invoice into the
 * next one (R9 to R12), and returns the invoices from `fromMonth` to
 * `toMonth`. Money is summed in cents.
 */
export function getInvoices(
  card: CardSnapshot,
  today: Date,
  { fromMonth, toMonth, isRemovedPayment = () => false }: InvoiceRange,
): Invoice[] {
  const totals = getTotalsByMonth(card, isRemovedPayment);
  const forecastCents = new Map<number, number>();
  getForecasts(card, today, toMonth).forEach(({ invoiceMonth, value }) =>
    forecastCents.set(
      invoiceMonth,
      (forecastCents.get(invoiceMonth) ?? 0) + toCents(value),
    ),
  );

  const firstDataMonth = Math.min(toMonth, ...totals.keys());
  const startMonth = Math.min(fromMonth, firstDataMonth);
  const invoices: Invoice[] = [];
  let creditIn = 0;

  for (
    let monthKey = Number.isFinite(startMonth) ? startMonth : firstDataMonth;
    monthKey <= toMonth;
    monthKey++
  ) {
    const { charges, refunds, paid } = totals.get(monthKey) ?? {
      charges: 0,
      refunds: 0,
      paid: 0,
    };
    const total = charges - refunds - creditIn;
    const balance = total - paid;
    const creditOut = Math.max(0, -balance);

    if (monthKey >= fromMonth) {
      const dates = getInvoiceDates(card.cycles, monthKey);

      invoices.push({
        month: monthKey,
        ...dates,
        charges: fromCents(charges),
        refunds: fromCents(refunds),
        creditIn: fromCents(creditIn),
        total: fromCents(total),
        paid: fromCents(paid),
        balance: fromCents(balance),
        creditOut: fromCents(creditOut),
        forecast: fromCents(forecastCents.get(monthKey) ?? 0),
        status: getInvoiceStatus(dates, balance, today),
      });
    }

    creditIn = creditOut;
  }

  return invoices;
}

/**
 * A balance to pay on an invoice that is not future: what takes the Pagar
 * action (R14, R5) and what the card page opens on (R44).
 */
export function hasBalanceToPay(invoice: Invoice) {
  return invoice.status !== 'FUTURE' && invoice.balance > 0;
}

// Derived values ---------------------------------------------------------------

/** Everything the card owes, future installments included (R31, R32). */
export function getLimit(card: CardSnapshot) {
  let usedCents = 0;

  getTotalsByMonth(card, () => false).forEach(
    ({ charges, refunds, paid }) => (usedCents += charges - refunds - paid),
  );

  return {
    total: card.limit,
    used: fromCents(usedCents),
    available: fromCents(toCents(card.limit) - usedCents),
  };
}

function getSeriesWindow(today: Date) {
  const currentMonth = getMonthKey(today);

  return {
    fromMonth: currentMonth - SERIES_MONTHS_AROUND,
    toMonth: currentMonth + SERIES_MONTHS_AROUND,
  };
}

/** Closed invoices due in 5 days or less, and overdue ones (R33). */
export function getReminderInvoices(card: CardSnapshot, today: Date) {
  if (card.archivedAt) return [];

  return getInvoices(card, today, {
    fromMonth: Number.NEGATIVE_INFINITY,
    toMonth: getInvoiceMonth(card.cycles, today),
  }).filter(
    (invoice) =>
      invoice.status === 'OVERDUE' ||
      (invoice.status === 'CLOSED' &&
        daysBetween(today, invoice.dueDate) <= REMINDER_DAYS_BEFORE_DUE),
  );
}

/**
 * The invoice selected when the card page opens (R44): the oldest one with a
 * balance among Open, Closed and Overdue, else the open invoice.
 */
export function getDefaultInvoiceMonth(card: CardSnapshot, today: Date) {
  const openMonth = getInvoiceMonth(card.cycles, today);
  const oldestUnpaid = getInvoices(card, today, {
    fromMonth: Number.NEGATIVE_INFINITY,
    toMonth: openMonth,
  }).find(hasBalanceToPay);

  return oldestUnpaid?.month ?? openMonth;
}

function toSeriesPoint(invoice: Invoice): CardSeriesPoint {
  const totalCents = toCents(invoice.total);
  const forecastCents = toCents(invoice.forecast);

  return {
    month: formatMonthKey(invoice.month),
    total: invoice.total,
    forecast: invoice.forecast,
    balance: invoice.balance,
    credit: invoice.creditOut,
    value: fromCents(Math.max(0, totalCents) + forecastCents),
    status: invoice.status,
    isFuture: invoice.status === 'FUTURE',
  };
}

/**
 * The card strip (R43, KTD12): 13 due months around the current one, starting
 * earlier when an older invoice still has a balance.
 */
export function getCardSeries(card: CardSnapshot, today: Date) {
  const { fromMonth, toMonth } = getSeriesWindow(today);
  const oldestUnpaid = getInvoices(card, today, {
    fromMonth: Number.NEGATIVE_INFINITY,
    toMonth,
  }).find(hasBalanceToPay);

  return getInvoices(card, today, {
    fromMonth: Math.min(fromMonth, oldestUnpaid?.month ?? fromMonth),
    toMonth,
  }).map(toSeriesPoint);
}

/** The overall chart (R41): the non-archived cards summed by due month. */
export function getCardsSeries(cards: CardSnapshot[], today: Date) {
  const { fromMonth, toMonth } = getSeriesWindow(today);
  const perCard = cards
    .filter((card) => !card.archivedAt)
    .map((card) =>
      getInvoices(card, today, { fromMonth, toMonth }).map(toSeriesPoint),
    );
  const series: CardsSeriesPoint[] = [];

  for (let index = 0; index <= toMonth - fromMonth; index++) {
    const points = perCard.map((cardPoints) => cardPoints[index]);
    const sum = (field: 'total' | 'forecast' | 'credit' | 'value') =>
      fromCents(
        points.reduce((cents, point) => cents + toCents(point[field]), 0),
      );

    series.push({
      month: formatMonthKey(fromMonth + index),
      total: sum('total'),
      forecast: sum('forecast'),
      credit: sum('credit'),
      value: sum('value'),
      isFuture: points.every((point) => point.isFuture),
    });
  }

  return series;
}

export type CategoryEntry = {
  categoryId: string | null;
  kind: 'PURCHASE' | 'REFUND';
  value: number;
};

/**
 * Totals by category for the Categorias tab (R45): refunds subtract from
 * their own category, or from "no category", and the share is taken out of
 * the categories with a positive total.
 */
export function getCategoryTotals(entries: CategoryEntry[]) {
  const centsByCategory = new Map<string | null, number>();

  entries.forEach(({ categoryId, kind, value }) => {
    const cents = kind === 'REFUND' ? -toCents(value) : toCents(value);
    centsByCategory.set(
      categoryId,
      (centsByCategory.get(categoryId) ?? 0) + cents,
    );
  });

  const positiveCents = [...centsByCategory.values()].reduce(
    (sum, cents) => sum + Math.max(0, cents),
    0,
  );

  return [...centsByCategory]
    .sort(([, a], [, b]) => b - a)
    .map(([categoryId, cents]) => ({
      categoryId,
      total: fromCents(cents),
      share: positiveCents > 0 ? Math.max(0, cents) / positiveCents : 0,
    }));
}

/** Invoices due in the current month and the summed limit (R40). */
export function getCardsSummary(cards: CardSnapshot[], today: Date) {
  const currentMonth = getMonthKey(today);
  let invoicesCents = 0;
  let limitCents = 0;
  let usedCents = 0;

  cards
    .filter((card) => !card.archivedAt)
    .forEach((card) => {
      const [invoice] = getInvoices(card, today, {
        fromMonth: currentMonth,
        toMonth: currentMonth,
      });
      invoicesCents += Math.max(0, toCents(invoice.total));
      limitCents += toCents(card.limit);
      usedCents += toCents(getLimit(card).used);
    });

  return {
    invoicesTotal: fromCents(invoicesCents),
    limit: {
      total: fromCents(limitCents),
      used: fromCents(usedCents),
      available: fromCents(limitCents - usedCents),
    },
  };
}

/**
 * Invoices that go from nothing to pay to a balance once the payments are
 * removed (R38, KTD9). Future invoices are left out: they take no payment.
 */
export function getReopenedInvoices(
  card: CardSnapshot,
  today: Date,
  isRemovedPayment: (payment: CardPayment) => boolean,
) {
  const removedMonths = card.payments
    .filter((payment) => payment.cardInvoiceMonth && isRemovedPayment(payment))
    .map((payment) => getMonthKey(payment.cardInvoiceMonth));
  if (removedMonths.length === 0) return [];

  const entryMonths = card.purchases.flatMap((purchase) =>
    purchase.installments.map(({ invoiceMonth }) => getMonthKey(invoiceMonth)),
  );
  const range = {
    fromMonth: Math.min(...removedMonths),
    toMonth: Math.max(getInvoiceMonth(card.cycles, today), ...entryMonths),
  };

  const before = getInvoices(card, today, range);
  const after = getInvoices(card, today, { ...range, isRemovedPayment });

  return after
    .filter(
      (invoice, index) =>
        hasBalanceToPay(invoice) && before[index].balance <= 0,
    )
    .map(({ month, balance, dueDate }) => ({ month, balance, dueDate }));
}
