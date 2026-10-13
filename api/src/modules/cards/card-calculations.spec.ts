import { formatMonthKey, parseMonthKey } from 'src/shared/calendar';
import {
  CardCycle,
  CardPayment,
  CardPurchaseSnapshot,
  CardSnapshot,
  RecurringChargeRule,
  getCardSeries,
  getCardsSeries,
  getCardsSummary,
  getChargeDates,
  getCategoryTotals,
  getChargesToMaterialize,
  getCycleChangeMonth,
  getDefaultInvoiceMonth,
  getFirstCycleMonth,
  getInstallments,
  getInvoiceDates,
  getInvoiceMonth,
  getInvoices,
  getLimit,
  getReminderInvoices,
  getReopenedInvoices,
  splitInstallmentValues,
} from './card-calculations';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const m = (value: string) => parseMonthKey(value);
const monthDate = (value: string) => day(`${value}-01`);

const cycle = (
  closingDay: number,
  dueDay: number,
  effectiveFrom = '2026-01',
): CardCycle => ({
  closingDay,
  dueDay,
  effectiveFrom: monthDate(effectiveFrom),
});

// Nubank in the examples: closes on the 3rd and is due on the 10th.
const nubank = [cycle(3, 10)];

let cardCounter = 0;

function makeCard(overrides: Partial<CardSnapshot> = {}): CardSnapshot {
  cardCounter += 1;
  return {
    id: `card-${cardCounter}`,
    limit: 10000,
    archivedAt: null,
    cycles: nubank,
    purchases: [],
    payments: [],
    recurringCharges: [],
    ...overrides,
  };
}

function purchase(
  month: string,
  value: number,
  kind: 'PURCHASE' | 'REFUND' = 'PURCHASE',
): CardPurchaseSnapshot {
  return { kind, installments: [{ invoiceMonth: monthDate(month), value }] };
}

function payment(
  month: string,
  value: number,
  bankAccountId = 'itau',
): CardPayment {
  return {
    cardInvoiceMonth: monthDate(month),
    value,
    type: 'EXPENSE',
    bankAccountId,
  };
}

function invoiceOf(card: CardSnapshot, month: string, today: Date) {
  const [invoice] = getInvoices(card, today, {
    fromMonth: m(month),
    toMonth: m(month),
  });
  return invoice;
}

function datesOf(cycles: CardCycle[], month: string) {
  const { closingDate, dueDate, periodStart } = getInvoiceDates(
    cycles,
    m(month),
  );
  return { closingDate, dueDate, periodStart };
}

describe('invoice dates', () => {
  it('AE1: a purchase on October 2nd goes to the October invoice, due on 10/10, and one on October 3rd goes to November', () => {
    expect(formatMonthKey(getInvoiceMonth(nubank, day('2026-10-02')))).toBe(
      '2026-10',
    );
    expect(datesOf(nubank, '2026-10').dueDate).toEqual(day('2026-10-10'));
    expect(formatMonthKey(getInvoiceMonth(nubank, day('2026-10-03')))).toBe(
      '2026-11',
    );
  });

  it('closes 28 and due 5: November closes on 10/28 and is due on 11/5', () => {
    const cycles = [cycle(28, 5)];

    expect(datesOf(cycles, '2026-11')).toMatchObject({
      closingDate: day('2026-10-28'),
      dueDate: day('2026-11-05'),
    });
    expect(formatMonthKey(getInvoiceMonth(cycles, day('2026-10-27')))).toBe(
      '2026-11',
    );
    expect(formatMonthKey(getInvoiceMonth(cycles, day('2026-10-28')))).toBe(
      '2026-12',
    );
  });

  it('closes 28 and due 29 in Feb/2027: due on 02/28, closes the day before, and no month repeats a due date', () => {
    const cycles = [cycle(28, 29)];

    expect(datesOf(cycles, '2027-02')).toEqual({
      closingDate: day('2027-02-27'),
      dueDate: day('2027-02-28'),
      periodStart: day('2027-01-28'),
    });
    expect(datesOf(cycles, '2027-03').dueDate).toEqual(day('2027-03-29'));

    const months = ['2027-01', '2027-02', '2027-03', '2027-04'];
    const dueDates = months.map((month) => datesOf(cycles, month).dueDate);
    const closingDates = months.map(
      (month) => datesOf(cycles, month).closingDate,
    );
    for (let i = 1; i < months.length; i++) {
      expect(dueDates[i].getTime()).toBeGreaterThan(dueDates[i - 1].getTime());
      expect(closingDates[i].getTime()).toBeGreaterThan(
        closingDates[i - 1].getTime(),
      );
    }
  });

  it('closes 10 and due 10: November closes on 10/10 and is due on 11/10', () => {
    expect(datesOf([cycle(10, 10)], '2026-11')).toMatchObject({
      closingDate: day('2026-10-10'),
      dueDate: day('2026-11-10'),
    });
  });

  it('closes 31: in April the closing falls on 04/30', () => {
    expect(datesOf([cycle(31, 10)], '2027-05').closingDate).toEqual(
      day('2027-04-30'),
    );
  });

  it('uses the first cycle version for months before it', () => {
    const cycles = [cycle(3, 10, '2026-10'), cycle(10, 17, '2026-11')];

    expect(datesOf(cycles, '2026-08').closingDate).toEqual(day('2026-08-03'));
  });
});

describe('cycle changes', () => {
  it('AE13: changing on 10/5 to closes 10 and due 17 keeps October on 10/3, and November closes on 11/10 and is due on 11/17', () => {
    const today = day('2026-10-05');
    const startMonth = getCycleChangeMonth(nubank, cycle(10, 17), today);
    expect(formatMonthKey(startMonth)).toBe('2026-11');

    const cycles = [...nubank, cycle(10, 17, formatMonthKey(startMonth))];
    expect(datesOf(cycles, '2026-10')).toMatchObject({
      closingDate: day('2026-10-03'),
      dueDate: day('2026-10-10'),
    });
    expect(datesOf(cycles, '2026-11')).toMatchObject({
      closingDate: day('2026-11-10'),
      dueDate: day('2026-11-17'),
    });
    expect(formatMonthKey(getInvoiceMonth(cycles, day('2026-10-03')))).toBe(
      '2026-11',
    );
    expect(formatMonthKey(getInvoiceMonth(cycles, day('2026-11-09')))).toBe(
      '2026-11',
    );
    expect(formatMonthKey(getInvoiceMonth(cycles, day('2026-11-10')))).toBe(
      '2026-12',
    );
  });

  it('AE19: changing on 10/28 to closes 26 and due 2 keeps November on 11/3 and 11/10, and the new version starts in December', () => {
    const today = day('2026-10-28');
    const startMonth = getCycleChangeMonth(nubank, cycle(26, 2), today);
    expect(formatMonthKey(startMonth)).toBe('2026-12');

    const cycles = [...nubank, cycle(26, 2, formatMonthKey(startMonth))];
    expect(datesOf(cycles, '2026-11')).toMatchObject({
      closingDate: day('2026-11-03'),
      dueDate: day('2026-11-10'),
    });
    expect(datesOf(cycles, '2026-12')).toMatchObject({
      closingDate: day('2026-11-26'),
      dueDate: day('2026-12-02'),
    });
  });

  it('changing on 10/26 from closes 25/due 30 to closes 20/due 1 moves December closing to the day after November closing', () => {
    const before = [cycle(25, 30)];
    const today = day('2026-10-26');
    const startMonth = getCycleChangeMonth(before, cycle(20, 1), today);
    expect(formatMonthKey(startMonth)).toBe('2026-12');

    const cycles = [...before, cycle(20, 1, formatMonthKey(startMonth))];
    expect(datesOf(cycles, '2026-11').closingDate).toEqual(day('2026-11-25'));
    expect(datesOf(cycles, '2026-12')).toMatchObject({
      closingDate: day('2026-11-26'),
      dueDate: day('2026-12-01'),
    });
    expect(datesOf(cycles, '2027-01').closingDate).toEqual(day('2026-12-20'));
  });

  it('records the first version in the month of the last closed invoice, so a card created on 10/4 and edited on 10/5 keeps the October dates', () => {
    const firstMonth = getFirstCycleMonth(cycle(3, 10), day('2026-10-04'));
    expect(formatMonthKey(firstMonth)).toBe('2026-10');

    const created = [cycle(3, 10, formatMonthKey(firstMonth))];
    const startMonth = getCycleChangeMonth(
      created,
      cycle(10, 17),
      day('2026-10-05'),
    );
    expect(formatMonthKey(startMonth)).toBe('2026-11');

    const cycles = [...created, cycle(10, 17, formatMonthKey(startMonth))];
    expect(datesOf(cycles, '2026-10')).toMatchObject({
      closingDate: day('2026-10-03'),
      dueDate: day('2026-10-10'),
    });
    expect(datesOf(cycles, '2026-11').closingDate).toEqual(day('2026-11-10'));
  });
});

describe('installments', () => {
  it('AE2: R$ 1.000 in 3x on 10/15 become R$ 333,34, R$ 333,33 and R$ 333,33 in November, December and January', () => {
    expect(splitInstallmentValues(1000, 3)).toEqual([333.34, 333.33, 333.33]);

    const installments = getInstallments(
      {
        totalValue: 1000,
        installmentsCount: 3,
        currentInstallment: 1,
        purchaseDay: day('2026-10-15'),
        anchorInvoiceMonth: null,
      },
      nubank,
    );

    expect(
      installments.map(({ number, value, invoiceMonth }) => [
        number,
        value,
        formatMonthKey(invoiceMonth),
      ]),
    ).toEqual([
      [1, 333.34, '2026-11'],
      [2, 333.33, '2026-12'],
      [3, 333.33, '2027-01'],
    ]);
  });

  it('places a single purchase in the invoice of its date', () => {
    const [installment] = getInstallments(
      {
        totalValue: 50,
        installmentsCount: 1,
        currentInstallment: 1,
        purchaseDay: day('2026-10-02'),
        anchorInvoiceMonth: null,
      },
      nubank,
    );

    expect(installment).toEqual({
      number: 1,
      value: 50,
      invoiceMonth: m('2026-10'),
    });
  });

  it('AE3: anchor October, installment of R$ 400, k = 4 and N = 10 create 7 installments from October to April, and the used limit rises R$ 2.800', () => {
    const installments = getInstallments(
      {
        totalValue: 4000,
        installmentsCount: 10,
        currentInstallment: 4,
        purchaseDay: day('2026-06-20'),
        anchorInvoiceMonth: m('2026-10'),
      },
      nubank,
    );

    expect(installments.map(({ number }) => number)).toEqual([
      4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(installments.every(({ value }) => value === 400)).toBe(true);
    expect(formatMonthKey(installments[0].invoiceMonth)).toBe('2026-10');
    expect(formatMonthKey(installments[6].invoiceMonth)).toBe('2027-04');

    const card = makeCard({
      purchases: [
        {
          kind: 'PURCHASE',
          installments: installments.map(({ value, invoiceMonth }) => ({
            value,
            invoiceMonth: monthDate(formatMonthKey(invoiceMonth)),
          })),
        },
      ],
    });
    expect(getLimit(card).used).toBe(2800);
  });

  it('AE17: with the same anchor and k = 5, installments 5 to 10 go from October to March', () => {
    const installments = getInstallments(
      {
        totalValue: 4000,
        installmentsCount: 10,
        currentInstallment: 5,
        purchaseDay: day('2026-06-20'),
        anchorInvoiceMonth: m('2026-10'),
      },
      nubank,
    );

    expect(installments.map(({ number }) => number)).toEqual([
      5, 6, 7, 8, 9, 10,
    ]);
    expect(formatMonthKey(installments[0].invoiceMonth)).toBe('2026-10');
    expect(formatMonthKey(installments[5].invoiceMonth)).toBe('2027-03');
  });
});

describe('invoice cascade', () => {
  it('AE4: a R$ 1.230 invoice with a R$ 1.000 payment keeps R$ 230 to pay in October, and November gets no credit; a second payment pays it off', () => {
    const today = day('2026-10-05');
    const card = makeCard({
      purchases: [purchase('2026-10', 1230)],
      payments: [payment('2026-10', 1000, 'itau')],
    });

    expect(invoiceOf(card, '2026-10', today)).toMatchObject({
      total: 1230,
      paid: 1000,
      balance: 230,
      status: 'CLOSED',
    });
    expect(invoiceOf(card, '2026-11', today)).toMatchObject({
      creditIn: 0,
      total: 0,
    });

    card.payments.push(payment('2026-10', 230, 'inter'));
    expect(invoiceOf(card, '2026-10', today)).toMatchObject({
      balance: 0,
      status: 'PAID',
    });
  });

  it('AE5: November with R$ 200 in purchases and a R$ 1.000 refund totals −R$ 800 and is paid after closing; December, with R$ 1.500, totals R$ 700', () => {
    const today = day('2026-11-04');
    const card = makeCard({
      purchases: [
        purchase('2026-11', 200),
        purchase('2026-11', 1000, 'REFUND'),
        purchase('2026-12', 1500),
      ],
    });

    expect(invoiceOf(card, '2026-11', today)).toMatchObject({
      total: -800,
      status: 'PAID',
      creditOut: 800,
    });
    expect(invoiceOf(card, '2026-12', today)).toMatchObject({
      creditIn: 800,
      total: 700,
    });
  });

  it('AE7: removing the R$ 100 installments of three paid invoices carries R$ 300 of credit into November', () => {
    const today = day('2026-10-20');
    const card = makeCard({
      payments: [
        payment('2026-08', 100),
        payment('2026-09', 100),
        payment('2026-10', 100),
      ],
    });

    expect(invoiceOf(card, '2026-11', today)).toMatchObject({
      creditIn: 300,
      total: -300,
      status: 'OPEN',
    });
  });

  it('computes the status from the dates: Closed on the closing day and on the due day, Overdue the day after, Future before its period starts', () => {
    const card = makeCard({ purchases: [purchase('2026-10', 100)] });

    expect(invoiceOf(card, '2026-10', day('2026-10-02')).status).toBe('OPEN');
    expect(invoiceOf(card, '2026-10', day('2026-10-03')).status).toBe('CLOSED');
    expect(invoiceOf(card, '2026-10', day('2026-10-10')).status).toBe('CLOSED');
    expect(invoiceOf(card, '2026-10', day('2026-10-11')).status).toBe(
      'OVERDUE',
    );
    expect(invoiceOf(card, '2026-11', day('2026-10-02')).status).toBe('FUTURE');
  });

  it('AE6: a new purchase in a paid invoice whose due date passed makes it overdue', () => {
    const today = day('2026-10-20');
    const card = makeCard({
      purchases: [purchase('2026-10', 1000)],
      payments: [payment('2026-10', 1000)],
    });
    expect(invoiceOf(card, '2026-10', today).status).toBe('PAID');

    const month = getInvoiceMonth(nubank, day('2026-09-28'));
    card.purchases.push(purchase(formatMonthKey(month), 50));

    expect(invoiceOf(card, '2026-10', today)).toMatchObject({
      balance: 50,
      status: 'OVERDUE',
    });
    expect(
      getReminderInvoices(card, today).map((invoice) => invoice.month),
    ).toEqual([m('2026-10')]);
  });

  it('keeps an open invoice paid in full before closing as Open', () => {
    const card = makeCard({
      purchases: [purchase('2026-11', 100)],
      payments: [payment('2026-11', 100)],
    });

    expect(invoiceOf(card, '2026-11', day('2026-10-15'))).toMatchObject({
      balance: 0,
      status: 'OPEN',
    });
  });

  it('sums in cents: payments of R$ 0,10, R$ 0,20 and R$ 0,30 pay off a R$ 0,60 invoice', () => {
    const card = makeCard({
      purchases: [purchase('2026-10', 0.6)],
      payments: [
        payment('2026-10', 0.1),
        payment('2026-10', 0.2),
        payment('2026-10', 0.3),
      ],
    });

    expect(invoiceOf(card, '2026-10', day('2026-10-20'))).toMatchObject({
      balance: 0,
      status: 'PAID',
    });
  });

  it('only counts expense transactions as payments', () => {
    const card = makeCard({
      purchases: [purchase('2026-10', 100)],
      payments: [{ ...payment('2026-10', 100), type: 'INCOME' }],
    });

    expect(invoiceOf(card, '2026-10', day('2026-10-20')).balance).toBe(100);
  });
});

describe('recurring charges', () => {
  const netflix = (
    overrides: Partial<RecurringChargeRule> = {},
  ): RecurringChargeRule => ({
    id: 'netflix',
    value: 55,
    firstChargeDate: day('2026-10-20'),
    materializedThrough: day('2026-10-19'),
    cancelledAt: null,
    ...overrides,
  });

  it('AE8: before the charge date the charge is a forecast in November, out of the total and the limit; once materialized it counts in both', () => {
    const before = makeCard({ recurringCharges: [netflix()] });
    const october10 = day('2026-10-10');

    const november = getCardSeries(before, october10).find(
      (point) => point.month === '2026-11',
    );
    expect(november).toMatchObject({ total: 0, forecast: 55, value: 55 });
    expect(invoiceOf(before, '2026-11', october10).total).toBe(0);
    expect(getLimit(before).used).toBe(0);

    const october20 = day('2026-10-20');
    expect(getChargesToMaterialize(netflix(), october20)).toEqual([
      day('2026-10-20'),
    ]);

    const after = makeCard({
      recurringCharges: [netflix({ materializedThrough: day('2026-10-20') })],
      purchases: [purchase('2026-11', 55)],
    });
    expect(invoiceOf(after, '2026-11', october20)).toMatchObject({
      total: 55,
      forecast: 0,
    });
    expect(invoiceOf(after, '2026-12', october20).forecast).toBe(55);
    expect(getLimit(after).used).toBe(55);
  });

  it('charges on the last day of shorter months, and a cancelled rule stops on the cancellation date', () => {
    const monthEnd = netflix({
      firstChargeDate: day('2027-01-31'),
      materializedThrough: day('2027-01-30'),
    });
    expect(
      getChargeDates(monthEnd, day('2027-01-30'), day('2027-03-31')),
    ).toEqual([day('2027-01-31'), day('2027-02-28'), day('2027-03-31')]);

    const cancelled = netflix({
      firstChargeDate: day('2027-01-20'),
      materializedThrough: day('2027-01-19'),
      cancelledAt: day('2027-03-20'),
    });
    expect(
      getChargeDates(cancelled, day('2027-01-19'), day('2027-04-30')),
    ).toEqual([day('2027-01-20'), day('2027-02-20')]);
  });

  it('does not forecast charges before the watermark or after the cancellation', () => {
    const card = makeCard({
      recurringCharges: [
        netflix({
          materializedThrough: day('2026-10-25'),
          cancelledAt: day('2026-12-01'),
        }),
      ],
    });
    const today = day('2026-10-21');

    expect(invoiceOf(card, '2026-11', today).forecast).toBe(0);
    expect(invoiceOf(card, '2026-12', today).forecast).toBe(55);
    expect(invoiceOf(card, '2027-01', today).forecast).toBe(0);
  });
});

describe('limit', () => {
  it('AE9: a R$ 10.000 limit with R$ 10.200 used leaves −R$ 200 available', () => {
    const card = makeCard({ purchases: [purchase('2026-11', 10200)] });

    expect(getLimit(card)).toEqual({
      total: 10000,
      used: 10200,
      available: -200,
    });
  });

  it('subtracts refunds and payments from every invoice, including future installments', () => {
    const card = makeCard({
      purchases: [
        purchase('2026-09', 300),
        purchase('2027-02', 400),
        purchase('2026-10', 50, 'REFUND'),
      ],
      payments: [payment('2026-09', 300)],
    });

    expect(getLimit(card).used).toBe(350);
  });
});

describe('reminders', () => {
  it('includes a closed invoice 5 days before its due date, not 6, includes overdue invoices and leaves out paid ones', () => {
    const card = makeCard({ purchases: [purchase('2026-10', 100)] });
    const months = (today: string) =>
      getReminderInvoices(card, day(today)).map((invoice) =>
        formatMonthKey(invoice.month),
      );

    expect(months('2026-10-04')).toEqual([]);
    expect(months('2026-10-05')).toEqual(['2026-10']);
    expect(months('2026-10-11')).toEqual(['2026-10']);

    card.payments.push(payment('2026-10', 100));
    expect(months('2026-10-11')).toEqual([]);
  });

  it('leaves out archived cards', () => {
    const card = makeCard({
      archivedAt: new Date('2026-10-01T12:00:00Z'),
      purchases: [purchase('2026-10', 100)],
    });

    expect(getReminderInvoices(card, day('2026-10-11'))).toEqual([]);
  });
});

describe('getDefaultInvoiceMonth', () => {
  it('picks the oldest overdue invoice with balance over the open one', () => {
    const card = makeCard({
      purchases: [purchase('2026-08', 100), purchase('2026-11', 50)],
    });

    expect(
      formatMonthKey(getDefaultInvoiceMonth(card, day('2026-10-20'))),
    ).toBe('2026-08');
  });

  it('picks the open invoice when nothing has a balance, and never a future one', () => {
    const card = makeCard({ purchases: [purchase('2026-12', 300)] });

    expect(
      formatMonthKey(getDefaultInvoiceMonth(card, day('2026-10-20'))),
    ).toBe('2026-11');
  });
});

describe('series', () => {
  const today = day('2026-10-12');

  it('has 13 due months centered on the current month, draws a negative total as zero and marks future invoices', () => {
    const card = makeCard({
      purchases: [
        purchase('2026-11', 100),
        purchase('2026-11', 300, 'REFUND'),
        purchase('2027-01', 250),
      ],
    });
    const series = getCardSeries(card, today);

    expect(series).toHaveLength(13);
    expect(series[0].month).toBe('2026-04');
    expect(series[12].month).toBe('2027-04');

    const november = series.find((point) => point.month === '2026-11');
    expect(november).toMatchObject({
      total: -200,
      credit: 200,
      value: 0,
      status: 'OPEN',
      isFuture: false,
    });
    const january = series.find((point) => point.month === '2027-01');
    expect(january).toMatchObject({
      total: 50,
      value: 50,
      isFuture: true,
    });
  });

  it('extends the card strip back to an overdue invoice from eight months ago', () => {
    const card = makeCard({ purchases: [purchase('2026-02', 80)] });
    const series = getCardSeries(card, today);

    expect(series[0]).toMatchObject({
      month: '2026-02',
      balance: 80,
      status: 'OVERDUE',
    });
    expect(series[series.length - 1].month).toBe('2027-04');
  });

  it('sums the non-archived cards and their forecasts in the overall chart', () => {
    const cards = [
      makeCard({ purchases: [purchase('2026-11', 100)] }),
      makeCard({
        cycles: [cycle(28, 5)],
        purchases: [purchase('2026-11', 40)],
        recurringCharges: [
          {
            id: 'spotify',
            value: 20,
            firstChargeDate: day('2026-10-15'),
            materializedThrough: day('2026-10-14'),
            cancelledAt: null,
          },
        ],
      }),
      makeCard({
        archivedAt: new Date('2026-09-01T12:00:00Z'),
        purchases: [purchase('2026-11', 999)],
      }),
    ];

    const series = getCardsSeries(cards, today);
    expect(series).toHaveLength(13);
    expect(series.find((point) => point.month === '2026-11')).toMatchObject({
      total: 140,
      forecast: 20,
      value: 160,
      isFuture: false,
    });
    expect(series.find((point) => point.month === '2027-02')).toMatchObject({
      isFuture: true,
    });
  });
});

describe('getCardsSummary', () => {
  it('sums the invoices due in the current month and the limits of the non-archived cards', () => {
    const today = day('2026-10-12');
    const cards = [
      makeCard({
        limit: 5000,
        purchases: [purchase('2026-10', 1230), purchase('2026-11', 70)],
        payments: [payment('2026-10', 1000)],
      }),
      makeCard({
        limit: 3000,
        purchases: [
          purchase('2026-10', 100),
          purchase('2026-10', 400, 'REFUND'),
        ],
      }),
      makeCard({
        limit: 9000,
        archivedAt: new Date('2026-09-01T12:00:00Z'),
        purchases: [purchase('2026-10', 500)],
      }),
    ];

    expect(getCardsSummary(cards, today)).toEqual({
      invoicesTotal: 1230,
      limit: { total: 8000, used: 0, available: 8000 },
    });
  });
});

describe('getReopenedInvoices', () => {
  const today = day('2026-10-20');
  const withoutItau = (payment: CardPayment) =>
    payment.bankAccountId === 'itau';

  it('AE11: removing the Itaú payments of August and September lists both invoices', () => {
    const card = makeCard({
      purchases: [
        purchase('2026-08', 500),
        purchase('2026-09', 300),
        purchase('2026-10', 200),
      ],
      payments: [
        payment('2026-08', 500, 'itau'),
        payment('2026-09', 300, 'itau'),
        payment('2026-10', 200, 'inter'),
      ],
    });

    expect(
      getReopenedInvoices(card, today, withoutItau).map(
        ({ month, balance }) => [formatMonthKey(month), balance],
      ),
    ).toEqual([
      ['2026-08', 500],
      ['2026-09', 300],
    ]);
  });

  it('also lists September when an extra August payment was the credit covering it', () => {
    const card = makeCard({
      purchases: [purchase('2026-08', 500), purchase('2026-09', 300)],
      payments: [
        payment('2026-08', 600, 'itau'),
        payment('2026-09', 200, 'inter'),
      ],
    });

    expect(
      getReopenedInvoices(card, today, withoutItau).map(
        ({ month, balance }) => [formatMonthKey(month), balance],
      ),
    ).toEqual([
      ['2026-08', 500],
      ['2026-09', 100],
    ]);
  });

  it('lists nothing when the payments leave every invoice paid', () => {
    const card = makeCard({
      purchases: [purchase('2026-09', 300)],
      payments: [payment('2026-09', 300, 'inter'), payment('2026-08', 0.01)],
    });

    expect(getReopenedInvoices(card, today, withoutItau)).toEqual([]);
  });
});

describe('getCategoryTotals', () => {
  it('sums each category, takes refunds from their own category or from "no category", and shares out the positive totals', () => {
    expect(
      getCategoryTotals([
        { categoryId: 'food', kind: 'PURCHASE', value: 300.1 },
        { categoryId: 'fun', kind: 'PURCHASE', value: 200 },
        { categoryId: 'food', kind: 'REFUND', value: 100.1 },
        { categoryId: null, kind: 'REFUND', value: 50 },
      ]),
    ).toEqual([
      { categoryId: 'food', total: 200, share: 0.5 },
      { categoryId: 'fun', total: 200, share: 0.5 },
      { categoryId: null, total: -50, share: 0 },
    ]);
  });
});
