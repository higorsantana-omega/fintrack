import { parseMonthKey } from 'src/shared/calendar';
import {
  CategoryNode,
  MonthCard,
  countsInTab,
  getCategoryMonthTotals,
  getMonthBudgets,
  getMonthCardItems,
} from './categories-calculations';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const m = (value: string) => parseMonthKey(value);

describe('countsInTab (KTD5)', () => {
  const base = {
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    creditCardId: null as string | null,
    goalId: null as string | null,
    borrowerId: null as string | null,
    debtId: null as string | null,
    categoryKey: null as string | null,
  };

  it('counts a plain transaction of the tab type, with or without category', () => {
    expect(countsInTab(base, 'EXPENSE')).toBe(true);
    expect(countsInTab({ ...base, categoryKey: 'food' }, 'EXPENSE')).toBe(true);
    expect(countsInTab(base, 'INCOME')).toBe(false);
  });

  it('AE11: a card payment recategorized to Outros does not count (creditCardId)', () => {
    expect(
      countsInTab(
        { ...base, creditCardId: 'c1', categoryKey: 'other' },
        'EXPENSE',
      ),
    ).toBe(false);
  });

  it('leaves out goals, loans and returns by link or by key (old rows)', () => {
    expect(countsInTab({ ...base, goalId: 'g' }, 'EXPENSE')).toBe(false);
    expect(countsInTab({ ...base, borrowerId: 'b' }, 'EXPENSE')).toBe(false);
    expect(
      countsInTab({ ...base, borrowerId: 'b', type: 'INCOME' }, 'INCOME'),
    ).toBe(false);
    for (const key of ['goals', 'card_payment', 'loans']) {
      expect(countsInTab({ ...base, categoryKey: key }, 'EXPENSE')).toBe(false);
    }
    expect(
      countsInTab({ ...base, type: 'INCOME', categoryKey: 'goals' }, 'INCOME'),
    ).toBe(false);
  });

  it('debts: an installment payment (expense) counts, the money coming in (income) does not', () => {
    const payment = { ...base, debtId: 'd', categoryKey: 'debts' };
    expect(countsInTab(payment, 'EXPENSE')).toBe(true);
    expect(countsInTab({ ...payment, type: 'INCOME' }, 'INCOME')).toBe(false);
    expect(
      countsInTab({ ...base, type: 'INCOME', categoryKey: 'debts' }, 'INCOME'),
    ).toBe(false);
  });
});

describe('getMonthCardItems (KTD6)', () => {
  const cycles = [
    { closingDay: 3, dueDay: 10, effectiveFrom: day('2026-01-01') },
  ];

  function card(overrides: Partial<MonthCard> = {}): MonthCard {
    return {
      id: 'card',
      limit: 10000,
      archivedAt: null,
      cycles,
      purchases: [],
      payments: [],
      recurringCharges: [],
      ...overrides,
    };
  }

  const installmentPurchase = (
    kind: 'PURCHASE' | 'REFUND',
    categoryId: string | null,
    installments: [number, string, number][],
    count = installments.length,
  ): MonthCard['purchases'][number] => ({
    id: `p-${categoryId}-${installments[0][0]}`,
    kind,
    description: 'Compra',
    purchaseDate: day('2026-09-20'),
    installmentsCount: count,
    category: categoryId ? { id: categoryId } : null,
    installments: installments.map(([number, month, value]) => ({
      number,
      value,
      invoiceMonth: day(`${month}-01`),
    })),
  });

  const recurring = (id: string, value: number, categoryId: string) => ({
    id,
    description: id,
    value,
    firstChargeDate: day('2026-08-25'),
    materializedThrough: day('2026-09-25'),
    cancelledAt: null,
    category: { id: categoryId },
  });

  it('AE2: a 12x purchase gives its own installment of each month, numbered', () => {
    const purchase = installmentPurchase(
      'PURCHASE',
      'shop',
      [
        [1, '2026-10', 100],
        [2, '2026-11', 100],
      ],
      12,
    );

    expect(
      getMonthCardItems(
        [card({ purchases: [purchase] })],
        day('2026-10-17'),
        m('2026-11'),
      ),
    ).toEqual([
      expect.objectContaining({
        cardId: 'card',
        categoryId: 'shop',
        cents: 10000,
        installmentNumber: 2,
        installmentsCount: 12,
        isForecast: false,
        isRefund: false,
      }),
    ]);
  });

  it('AE5: a refund comes in negative', () => {
    const refund = installmentPurchase('REFUND', 'cashback', [
      [1, '2026-10', 50],
    ]);
    const [item] = getMonthCardItems(
      [card({ purchases: [refund] })],
      day('2026-10-17'),
      m('2026-10'),
    );

    expect(item).toMatchObject({ cents: -5000, isRefund: true });
  });

  it('AE3: a forecast falls in the invoice month, in the rule current category', () => {
    // Closing on the 3rd: the 10/25 charge belongs to November's invoice.
    const rule = recurring('spotify', 12.9, 'music');
    const cards = [card({ recurringCharges: [rule] })];

    expect(getMonthCardItems(cards, day('2026-10-17'), m('2026-11'))).toEqual([
      expect.objectContaining({
        categoryId: 'music',
        cents: 1290,
        isForecast: true,
        installmentNumber: 1,
        installmentsCount: 1,
      }),
    ]);
    expect(getMonthCardItems(cards, day('2026-10-17'), m('2026-10'))).toEqual(
      [],
    );
  });

  it('AE14: an archived card keeps its November installment but has no forecast', () => {
    const purchase = installmentPurchase(
      'PURCHASE',
      'electronics',
      [[5, '2026-11', 80]],
      10,
    );
    const items = getMonthCardItems(
      [
        card({
          archivedAt: day('2026-10-01'),
          purchases: [purchase],
          recurringCharges: [recurring('streaming', 30, 'streaming')],
        }),
      ],
      day('2026-10-17'),
      m('2026-11'),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      categoryId: 'electronics',
      cents: 8000,
      isForecast: false,
    });
  });
});

describe('getCategoryMonthTotals (KTD4)', () => {
  const cat = (
    id: string,
    parentId: string | null,
    type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  ): CategoryNode => ({ id, type, key: null, parentId });
  const tree = [
    cat('shop', null),
    cat('online', 'shop'),
    cat('books', 'shop'),
    cat('digital', null),
    cat('cashback', 'digital'),
    cat('salary', null, 'INCOME'),
  ];
  const item = (categoryId: string | null, cents: number) => ({
    categoryId,
    cents,
  });
  const find = (
    result: ReturnType<typeof getCategoryMonthTotals>,
    id: string,
  ) => result.categories.find((c) => c.id === id);

  it('AE1: the group adds direct items and subcategories', () => {
    const result = getCategoryMonthTotals(
      tree,
      [item('shop', 64300), item('online', 24400), item('books', 14400)],
      'EXPENSE',
    );

    expect(find(result, 'shop')).toMatchObject({
      direct: 64300,
      total: 103100,
    });
    expect(find(result, 'online')).toMatchObject({
      direct: 24400,
      total: 24400,
    });
    expect(find(result, 'books')).toMatchObject({
      direct: 14400,
      total: 14400,
    });
  });

  it('AE5: a refund-only subcategory is negative and has no share', () => {
    const result = getCategoryMonthTotals(
      tree,
      [item('cashback', -5000), item('shop', 10000)],
      'EXPENSE',
    );

    expect(find(result, 'cashback')).toMatchObject({ total: -5000, share: 0 });
    expect(find(result, 'digital')).toMatchObject({ total: -5000, share: 0 });
    expect(find(result, 'shop')?.share).toBe(1);
    expect(result.net).toBe(5000);
  });

  it('puts null and other-tab categories in "no category"', () => {
    const result = getCategoryMonthTotals(
      tree,
      [
        item(null, 1000),
        item('salary', 500),
        item('ghost', 500),
        item('shop', 3000),
      ],
      'EXPENSE',
    );

    expect(result.noCategory.total).toBe(2000);
    expect(result.net).toBe(5000);
    expect(result.noCategory.share).toBeCloseTo(0.4);
    expect(find(result, 'shop')?.share).toBeCloseTo(0.6);
  });

  it('shares sum to 1 over positive groups and positive no-category only', () => {
    const result = getCategoryMonthTotals(
      tree,
      [item('shop', 3000), item('digital', 1000), item(null, -500)],
      'EXPENSE',
    );
    const sum =
      result.categories.reduce((s, c) => s + c.share, 0) +
      result.noCategory.share;

    expect(sum).toBeCloseTo(1);
    expect(result.noCategory.share).toBe(0);
    expect(result.net).toBe(3500);
  });

  it('lists only the categories of the tab type, and an empty month is zero', () => {
    const result = getCategoryMonthTotals(tree, [], 'INCOME');

    expect(result.categories.map((c) => c.id)).toEqual(['salary']);
    expect(result).toMatchObject({
      net: 0,
      noCategory: { total: 0, share: 0 },
    });
    expect(result.categories[0]).toMatchObject({ total: 0, share: 0 });
  });
});

describe('getMonthBudgets (KTD4)', () => {
  const nodes: CategoryNode[] = [
    { id: 'food', type: 'EXPENSE', key: 'food', parentId: null },
    { id: 'market', type: 'EXPENSE', key: null, parentId: 'food' },
    { id: 'restaurants', type: 'EXPENSE', key: null, parentId: 'food' },
    { id: 'fun', type: 'EXPENSE', key: 'fun', parentId: null },
    { id: 'tickets', type: 'EXPENSE', key: null, parentId: 'fun' },
    { id: 'gifts', type: 'EXPENSE', key: 'gifts', parentId: null },
  ];
  // Amounts in reais, as the database holds them.
  const budget = (categoryId: string, amount: number, monthAmount = null) => ({
    categoryId,
    amount,
    monthAmount,
  });
  const run = (
    spent: Record<string, number>,
    budgets: ReturnType<typeof budget>[],
  ) =>
    getMonthBudgets(
      getCategoryMonthTotals(
        nodes,
        Object.entries(spent).map(([categoryId, reais]) => ({
          categoryId,
          cents: reais * 100,
        })),
        'EXPENSE',
      ).categories,
      budgets,
    );

  it('AE1: each limit stands alone, and the group counts its subcategories', () => {
    const { byCategory } = run({ market: 600, restaurants: 400 }, [
      budget('food', 1500),
      budget('market', 800),
    ]);

    expect(byCategory.get('market')).toMatchObject({
      limit: 80000,
      remaining: 20000,
    });
    expect(byCategory.get('food')).toMatchObject({
      limit: 150000,
      remaining: 50000,
    });
  });

  it('AE2: the month override replaces the general limit and is marked', () => {
    const budgets = [budget('gifts', 200, 600)];

    expect(run({}, budgets).byCategory.get('gifts')).toMatchObject({
      limit: 60000,
      isAdjusted: true,
    });
    expect(
      run({}, [budget('gifts', 200)]).byCategory.get('gifts'),
    ).toMatchObject({ limit: 20000, isAdjusted: false });
  });

  it('AE3: OK up to 80%, WARNING above it, OVER past the limit', () => {
    const status = (reais: number) =>
      run({ gifts: reais }, [budget('gifts', 500)]).byCategory.get('gifts');

    expect(status(350)?.status).toBe('OK');
    expect(status(400)?.status).toBe('OK');
    expect(status(420)?.status).toBe('WARNING');
    expect(status(530)).toMatchObject({ status: 'OVER', remaining: -3000 });
  });

  it('spending 100% of the limit is still WARNING, with nothing left', () => {
    expect(
      run({ gifts: 500 }, [budget('gifts', 500)]).byCategory.get('gifts'),
    ).toMatchObject({ status: 'WARNING', remaining: 0 });
  });

  it('AE4: the balance takes the group limit, or else its subcategories limits', () => {
    const { balance } = run({ market: 600, restaurants: 400, tickets: 40 }, [
      budget('food', 1500),
      budget('tickets', 100),
    ]);

    expect(balance).toBe(56000);
  });

  it('counts a group once in the balance when it and a subcategory have limits', () => {
    const { balance } = run({ market: 600, restaurants: 400 }, [
      budget('food', 1500),
      budget('market', 800),
    ]);

    expect(balance).toBe(50000);
  });

  it('gives no limit object without a limit, and a null balance without any', () => {
    const { byCategory, balance } = run({ market: 100 }, []);

    expect(byCategory.size).toBe(0);
    expect(balance).toBeNull();
  });

  it('a refund keeps the status OK and leaves more than the limit', () => {
    expect(
      run({ gifts: -50 }, [budget('gifts', 500)]).byCategory.get('gifts'),
    ).toMatchObject({ status: 'OK', remaining: 55000 });
  });
});
