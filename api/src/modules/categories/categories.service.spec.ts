import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { CreditCardsRepository } from 'src/database/repositories/credit-cards.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { ParseMonthPipe } from 'src/pipes/ParseMonthPipe';
import { getInvoiceMonth } from '../cards/card-calculations';
import { formatMonthKey } from 'src/shared/calendar';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ValidateCategoryOwnershipService } from './validate-category-ownership.service';

const ANA = 'ana';
const BIA = 'bia';

type Row = {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  key: string | null;
  icon: string | null;
  color: string | null;
  type: 'INCOME' | 'EXPENSE';
};
type Item = { id: string; categoryId: string | null };

const row = (overrides: Partial<Row> & Pick<Row, 'id'>): Row => ({
  userId: ANA,
  parentId: null,
  name: overrides.id,
  key: null,
  icon: null,
  color: null,
  type: 'EXPENSE',
  ...overrides,
});

// Compras and Alimentação are default groups, Ração and Casamento are the
// user's own, Dívidas is a system group.
const seed = (): Row[] => [
  row({ id: 'shopping', name: 'Shopping', key: 'shopping', icon: 'bag' }),
  row({ id: 'food', name: 'Food', key: 'food', icon: 'utensils' }),
  row({ id: 'delivery', name: 'Delivery', key: 'delivery', parentId: 'food' }),
  row({ id: 'leisure', name: 'Leisure', key: 'leisure', icon: 'party' }),
  row({
    id: 'entertainment',
    name: 'Entertainment',
    key: 'entertainment',
    parentId: 'leisure',
  }),
  row({ id: 'debts', name: 'Debts', key: 'debts', icon: 'landmark' }),
  row({ id: 'goals', name: 'Goals', key: 'goals' }),
  row({ id: 'loans', name: 'Loans', key: 'loans' }),
  row({ id: 'card', name: 'Card payment', key: 'card_payment' }),
  row({ id: 'debts-income', name: 'Debts', key: 'debts', type: 'INCOME' }),
  row({ id: 'salary-group', name: 'Income', key: 'income', type: 'INCOME' }),
  row({ id: 'racao', name: 'Ração', parentId: 'shopping' }),
  row({ id: 'wedding', name: 'Casamento', icon: 'heart', color: '#E64980' }),
  row({ id: 'buffet', name: 'Buffet', parentId: 'wedding' }),
  row({ id: 'photographer', name: 'Fotógrafo', parentId: 'wedding' }),
  row({ id: 'bia-group', userId: BIA, name: 'Mine' }),
];

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);

function setToday(isoInstant: string) {
  jest.useFakeTimers({
    now: new Date(isoInstant),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categories: Row[];
  let transactions: Item[];
  let cardPurchases: Item[];
  let recurringCharges: Item[];
  let cards: any[];
  let accountTransactions: any[];
  let materialize: jest.Mock;

  const move = (items: Item[], from: string[], to: string) =>
    items.forEach((item) => {
      if (item.categoryId && from.includes(item.categoryId)) {
        item.categoryId = to;
      }
    });

  beforeEach(async () => {
    categories = seed();
    transactions = [
      { id: 't1', categoryId: 'racao' },
      { id: 't2', categoryId: 'racao' },
      { id: 't3', categoryId: 'racao' },
      { id: 't4', categoryId: 'shopping' },
      { id: 't5', categoryId: 'wedding' },
      { id: 't6', categoryId: 'buffet' },
    ];
    // The card of these items may be archived; the repository does not care.
    cardPurchases = [
      { id: 'p1', categoryId: 'racao' },
      { id: 'p2', categoryId: 'photographer' },
    ];
    recurringCharges = [
      { id: 'r1', categoryId: 'racao' },
      { id: 'r2', categoryId: 'buffet' },
    ];

    const categoriesRepository = {
      findMany: async (userId: string) =>
        categories.filter((category) => category.userId === userId),
      findFirst: async (userId: string, categoryId: string) =>
        categories.find(
          (category) =>
            category.userId === userId && category.id === categoryId,
        ) ?? null,
      findSiblings: async (
        userId: string,
        type: string,
        parentId: string | null,
      ) =>
        categories.filter(
          (category) =>
            category.userId === userId &&
            category.type === type &&
            category.parentId === parentId,
        ),
      create: jest.fn(async (data) => {
        const created = row({
          ...data,
          id: `new-${categories.length}`,
        } as Row);
        categories.push(created);
        return created;
      }),
      update: jest.fn(async (categoryId, data) => {
        const category = categories.find(({ id }) => id === categoryId);
        Object.assign(
          category,
          Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
        );
        return category;
      }),
      moveItemsAndDelete: jest.fn(async (ids: string[], to: string) => {
        move(transactions, ids, to);
        move(cardPurchases, ids, to);
        move(recurringCharges, ids, to);
        categories = categories.filter(({ id }) => !ids.includes(id));
      }),
    };

    cards = [];
    accountTransactions = [];
    materialize = jest.fn(async () => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        ValidateCategoryOwnershipService,
        { provide: CategoriesRepository, useValue: categoriesRepository },
        {
          provide: TransactionsRepository,
          useValue: {
            findManyForSummary: async (userId: string, from: Date, to: Date) =>
              accountTransactions.filter(
                (transaction) =>
                  transaction.userId === userId &&
                  transaction.date >= from &&
                  transaction.date < to,
              ),
          },
        },
        {
          provide: CreditCardsRepository,
          useValue: {
            findManyByUserId: async (userId: string) =>
              cards.filter((card) => card.userId === userId),
          },
        },
        {
          provide: CardPurchasesRepository,
          useValue: { materializeRecurringCharges: materialize },
        },
      ],
    }).compile();

    service = module.get(CategoriesService);
    setToday('2026-10-17T15:00:00.000Z');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const find = (id: string) =>
    categories.find((category) => category.id === id);
  const items = (categoryId: string) =>
    [...transactions, ...cardPurchases, ...recurringCharges].filter(
      (item) => item.categoryId === categoryId,
    );

  describe('create', () => {
    it("creates a subcategory in a group with the group's type, and no icon or color", async () => {
      const created = await service.create(ANA, {
        name: '  Caça  ',
        parentId: 'shopping',
      });

      expect(created).toMatchObject({
        name: 'Caça',
        parentId: 'shopping',
        type: 'EXPENSE',
        icon: null,
        color: null,
      });
    });

    it('creates a subcategory in a default or an income group', async () => {
      await expect(
        service.create(ANA, { name: 'Freelas', parentId: 'salary-group' }),
      ).resolves.toMatchObject({ type: 'INCOME', parentId: 'salary-group' });
    });

    it('creates a group with its type, icon and color', async () => {
      await expect(
        service.create(ANA, {
          name: 'Freelas',
          type: 'INCOME',
          icon: 'laptop',
          color: '#12B886',
        }),
      ).resolves.toMatchObject({
        name: 'Freelas',
        type: 'INCOME',
        parentId: null,
        icon: 'laptop',
        color: '#12B886',
      });
    });

    it.each(['debts', 'goals', 'racao'])(
      'returns 400 for a subcategory inside %s',
      async (parentId) => {
        await expect(
          service.create(ANA, { name: 'X', parentId }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it("returns 404 for a parent that is another user's", async () => {
      await expect(
        service.create(ANA, { name: 'X', parentId: 'bia-group' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('AE13: returns 409 for a name a sibling already has, ignoring case and edge spaces', async () => {
      await expect(
        service.create(ANA, { name: 'ração ', parentId: 'shopping' }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.create(ANA, { name: 'delivery', parentId: 'food' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows the same name in another group, and a group named like a subcategory', async () => {
      await service.create(ANA, { name: 'Ração', parentId: 'food' });
      await service.create(ANA, {
        name: 'Delivery',
        type: 'EXPENSE',
        icon: 'bike',
        color: '#FD7E14',
      });

      expect(categories.filter(({ name }) => name === 'Ração')).toHaveLength(2);
    });

    it('returns 409 for a group named like another group of the same type', async () => {
      await expect(
        service.create(ANA, {
          name: 'casamento',
          type: 'EXPENSE',
          icon: 'heart',
          color: '#E64980',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('renames an own subcategory', async () => {
      await service.update(ANA, 'racao', { name: 'Pet shop' });

      expect(find('racao').name).toBe('Pet shop');
    });

    it('renames an own group and changes its icon and color', async () => {
      await service.update(ANA, 'wedding', {
        name: 'Festa',
        icon: 'cake',
        color: '#4C6EF5',
      });

      expect(find('wedding')).toMatchObject({
        name: 'Festa',
        icon: 'cake',
        color: '#4C6EF5',
      });
    });

    it('returns 400 when an icon or a color is sent for a subcategory', async () => {
      await expect(
        service.update(ANA, 'racao', { name: 'Ração', icon: 'bag' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.update(ANA, 'racao', { name: 'Ração', color: '#4C6EF5' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns 409 for a name a sibling has, but not for its own name', async () => {
      await expect(
        service.update(ANA, 'buffet', { name: 'fotógrafo' }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.update(ANA, 'buffet', { name: 'BUFFET' }),
      ).resolves.toBeDefined();
    });

    it.each(['shopping', 'delivery', 'debts'])(
      'returns 409 for the category with a key %s',
      async (categoryId) => {
        await expect(
          service.update(ANA, categoryId, { name: 'X' }),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it("returns 404 for another user's category", async () => {
      await expect(
        service.update(ANA, 'bia-group', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('AE6: moves the items of a subcategory, card ones included, to its group', async () => {
      const before = items('shopping').length;

      await expect(service.remove(ANA, 'racao', {})).resolves.toBeNull();

      expect(find('racao')).toBeUndefined();
      expect(items('shopping')).toHaveLength(before + 5);
      expect(items('racao')).toEqual([]);
      expect(cardPurchases.find(({ id }) => id === 'p1').categoryId).toBe(
        'shopping',
      );
    });

    it('returns 400 for a group without a destination', async () => {
      await expect(service.remove(ANA, 'wedding', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(find('wedding')).toBeDefined();
    });

    it.each([
      ['one of its own subcategories', 'buffet'],
      ['itself', 'wedding'],
      ['an income category', 'salary-group'],
      ['a system category', 'debts'],
    ])('AE7: returns 400 for a destination in %s', async (_, destination) => {
      await expect(
        service.remove(ANA, 'wedding', { destinationCategoryId: destination }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(find('wedding')).toBeDefined();
      expect(find('buffet')).toBeDefined();
    });

    it("returns 404 for a destination that is another user's", async () => {
      await expect(
        service.remove(ANA, 'wedding', { destinationCategoryId: 'bia-group' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('AE7: moves the items of the group and its subcategories to the destination and deletes all three', async () => {
      await service.remove(ANA, 'wedding', {
        destinationCategoryId: 'entertainment',
      });

      expect(
        items('entertainment')
          .map(({ id }) => id)
          .sort(),
      ).toEqual(['p2', 'r2', 't5', 't6']);
      ['wedding', 'buffet', 'photographer'].forEach((id) =>
        expect(find(id)).toBeUndefined(),
      );
    });

    it.each(['shopping', 'delivery', 'goals'])(
      'returns 409 for the category with a key %s',
      async (categoryId) => {
        await expect(
          service.remove(ANA, categoryId, { destinationCategoryId: 'food' }),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it("returns 404 for another user's category", async () => {
      await expect(service.remove(ANA, 'bia-group', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getSummary', () => {
    // Closes on the 28th, due on the 5th: a charge on the 25th is on the invoice of the month.
    const cycles = [
      { closingDay: 28, dueDay: 5, effectiveFrom: day('2026-01-01') },
    ];
    const octoberInvoice = getInvoiceMonth(cycles, day('2026-10-25'));
    const month = formatMonthKey(octoberInvoice);

    const transaction = (overrides: object) => ({
      id: `tx-${accountTransactions.length}`,
      userId: ANA,
      name: 'Padaria',
      value: 20,
      date: noon(`${month}-05`),
      type: 'EXPENSE',
      categoryId: 'food',
      creditCardId: null,
      goalId: null,
      borrowerId: null,
      debtId: null,
      bankAccount: { id: 'itau', name: 'Itaú' },
      category: { key: 'food' },
      ...overrides,
    });
    const makeCard = (overrides: object = {}) => ({
      id: 'nubank',
      userId: ANA,
      name: 'Nubank',
      limit: 5000,
      archivedAt: null,
      cycles,
      purchases: [] as any[],
      payments: [],
      recurringCharges: [] as any[],
      ...overrides,
    });
    const purchase = (overrides: object = {}) => ({
      id: 'p',
      kind: 'PURCHASE',
      description: 'Notebook',
      purchaseDate: day('2026-10-02'),
      installmentsCount: 10,
      category: { id: 'racao' },
      installments: [
        { number: 4, value: 100, invoiceMonth: day(`${month}-01`) },
        { number: 5, value: 100, invoiceMonth: day('2099-01-01') },
      ],
      ...overrides,
    });
    const idOf = (item: { categoryId: string | null }) => item.categoryId;

    it("joins an account expense and the installment of the month's invoice, each with its origin", async () => {
      accountTransactions.push(transaction({}));
      cards.push(makeCard({ purchases: [purchase()] }));

      const summary = await service.getSummary(ANA, month, 'EXPENSE');

      expect(summary.items.map((item) => item.source)).toEqual(
        expect.arrayContaining([
          { type: 'ACCOUNT', id: 'itau', name: 'Itaú' },
          { type: 'CARD', id: 'nubank', name: 'Nubank' },
        ]),
      );
      expect(summary.net).toBe(120);
      expect(summary.categories.find(({ id }) => id === 'food').total).toBe(20);
      // Ração is a subcategory of Shopping, so the group adds it.
      expect(summary.categories.find(({ id }) => id === 'racao').total).toBe(
        100,
      );
      expect(summary.categories.find(({ id }) => id === 'shopping').total).toBe(
        100,
      );
    });

    it('marks the installment number and total, a refund and a forecast', async () => {
      const refund = purchase({
        id: 'refund',
        kind: 'REFUND',
        description: 'Estorno',
        installmentsCount: 1,
        category: { id: 'delivery' },
        installments: [
          { number: 1, value: 50, invoiceMonth: day(`${month}-01`) },
        ],
      });
      cards.push(
        makeCard({
          purchases: [purchase(), refund],
          recurringCharges: [
            {
              id: 'spotify',
              description: 'Spotify',
              value: 12.9,
              firstChargeDate: day('2026-08-25'),
              materializedThrough: day('2026-09-25'),
              cancelledAt: null,
              category: { id: 'entertainment' },
            },
          ],
        }),
      );

      const { items, categories } = await service.getSummary(
        ANA,
        month,
        'EXPENSE',
      );
      const byDescription = (description: string) =>
        items.find((item) => item.description === description);

      expect(byDescription('Notebook')).toMatchObject({
        installmentNumber: 4,
        installmentsCount: 10,
        value: 100,
        isForecast: false,
        isRefund: false,
      });
      expect(byDescription('Estorno')).toMatchObject({
        value: -50,
        isRefund: true,
      });
      expect(byDescription('Spotify')).toMatchObject({
        value: 12.9,
        isForecast: true,
        categoryId: 'entertainment',
      });
      expect(categories.find(({ id }) => id === 'delivery').total).toBe(-50);
    });

    it('brings the installments already posted and the forecasts of a future month', async () => {
      cards.push(
        makeCard({
          purchases: [purchase()],
          recurringCharges: [
            {
              id: 'spotify',
              description: 'Spotify',
              value: 12.9,
              firstChargeDate: day('2026-08-25'),
              materializedThrough: day('2026-09-25'),
              cancelledAt: null,
              category: { id: 'entertainment' },
            },
          ],
        }),
      );
      const future = formatMonthKey(octoberInvoice + 3);

      const { items } = await service.getSummary(ANA, future, 'EXPENSE');

      expect(items.map(({ description }) => description)).toEqual(['Spotify']);
    });

    it('counts a charge that fell due since the last read only after materializing', async () => {
      const card = makeCard();
      cards.push(card);
      materialize.mockImplementation(async () => {
        card.purchases.push(
          purchase({
            id: 'netflix',
            description: 'Netflix',
            installmentsCount: 1,
            installments: [
              { number: 1, value: 55, invoiceMonth: day(`${month}-01`) },
            ],
          }),
        );
      });

      const { items } = await service.getSummary(ANA, month, 'EXPENSE');

      expect(materialize).toHaveBeenCalledWith(ANA, day('2026-10-17'));
      expect(items.map(({ description }) => description)).toEqual(['Netflix']);
    });

    it('AE14: counts the installments of an archived card, and gives it no forecast', async () => {
      cards.push(
        makeCard({
          archivedAt: day('2026-09-01'),
          purchases: [purchase()],
          recurringCharges: [
            {
              id: 'spotify',
              description: 'Spotify',
              value: 12.9,
              firstChargeDate: day('2026-08-25'),
              materializedThrough: day('2026-09-25'),
              cancelledAt: null,
              category: { id: 'entertainment' },
            },
          ],
        }),
      );

      const { items } = await service.getSummary(ANA, month, 'EXPENSE');

      expect(items.map(({ description }) => description)).toEqual(['Notebook']);
    });

    it('AE4 and AE11: leaves out a card payment even when it was recategorized, and goals and loans', async () => {
      accountTransactions.push(
        transaction({ name: 'Fatura', value: 2000, creditCardId: 'nubank' }),
        transaction({
          name: 'Fatura Outros',
          value: 2000,
          creditCardId: 'nubank',
          categoryId: 'food',
        }),
        transaction({
          name: 'Aporte',
          goalId: 'goal',
          categoryId: 'goals',
          category: { key: 'goals' },
        }),
        transaction({
          name: 'Empréstimo',
          categoryId: 'loans',
          category: { key: 'loans' },
          borrowerId: 'b',
        }),
        // An old card payment with no link, found by its key.
        transaction({
          name: 'Fatura antiga',
          categoryId: 'card',
          category: { key: 'card_payment' },
        }),
        transaction({ name: 'Mercado', value: 30 }),
      );

      const summary = await service.getSummary(ANA, month, 'EXPENSE');

      expect(summary.items.map(({ description }) => description)).toEqual([
        'Mercado',
      ]);
      expect(summary.net).toBe(30);
    });

    it('counts a debt installment payment under Debts', async () => {
      accountTransactions.push(
        transaction({
          name: 'Parcela',
          value: 1200,
          debtId: 'debt',
          categoryId: 'debts',
          category: { key: 'debts' },
        }),
      );

      const summary = await service.getSummary(ANA, month, 'EXPENSE');

      expect(summary.categories.find(({ id }) => id === 'debts').total).toBe(
        1200,
      );
    });

    it('puts items without a category, or in a category of the other type, under "no category"', async () => {
      accountTransactions.push(
        transaction({ name: 'Solto', categoryId: null, category: null }),
        transaction({
          name: 'Salário no lugar errado',
          categoryId: 'salary-group',
        }),
      );

      const summary = await service.getSummary(ANA, month, 'EXPENSE');

      expect(summary.noCategory.total).toBe(40);
      expect(summary.items.map(idOf)).toEqual([null, null]);
    });

    it('returns only income transactions, and no card entry, on the INCOME tab', async () => {
      accountTransactions.push(
        transaction({}),
        transaction({
          name: 'Salário',
          type: 'INCOME',
          value: 5000,
          categoryId: 'salary-group',
          category: { key: 'income' },
        }),
        transaction({
          name: 'Entrada da dívida',
          type: 'INCOME',
          value: 900,
          debtId: 'debt',
          categoryId: 'debts-income',
          category: { key: 'debts' },
        }),
      );
      cards.push(makeCard({ purchases: [purchase()] }));

      const summary = await service.getSummary(ANA, month, 'INCOME');

      expect(summary.items.map(({ description }) => description)).toEqual([
        'Salário',
      ]);
      expect(summary.net).toBe(5000);
    });

    it('takes transactions by their date inside the month only', async () => {
      accountTransactions.push(
        transaction({ name: 'Na virada', date: noon('2026-09-30') }),
        transaction({ name: 'Dentro', date: noon('2026-10-31') }),
        transaction({ name: 'Depois', date: noon('2026-11-01') }),
      );

      const { items } = await service.getSummary(ANA, '2026-10', 'EXPENSE');

      expect(items.map(({ description }) => description)).toEqual(['Dentro']);
    });

    it("returns only the authenticated user's items", async () => {
      accountTransactions.push(transaction({ userId: BIA, name: 'Da Bia' }));
      cards.push(
        makeCard({
          userId: BIA,
          purchases: [purchase({ description: 'Da Bia' })],
        }),
      );

      const summary = await service.getSummary(ANA, month, 'EXPENSE');

      expect(summary.items).toEqual([]);
      expect(summary.net).toBe(0);
    });

    it('returns 400 for a month more than 120 months away', async () => {
      await expect(
        service.getSummary(ANA, '2037-01', 'EXPENSE'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.getSummary(ANA, '2016-09', 'EXPENSE'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.getSummary(ANA, '2036-10', 'EXPENSE'),
      ).resolves.toBeDefined();
    });

    it('rejects a month out of the YYYY-MM format and an invalid type with 400', async () => {
      const pipe = new ValidationPipe({ whitelist: true });

      expect(() => new ParseMonthPipe().transform('2026-13')).toThrow(
        BadRequestException,
      );
      await expect(
        pipe.transform(
          { type: 'BOTH' },
          { type: 'query', metatype: SummaryQueryDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAllByUserId', () => {
    it("returns only the user's categories", async () => {
      const own = await service.findAllByUserId(ANA);

      expect(own.every(({ userId }) => userId === ANA)).toBe(true);
      expect(own.map(({ id }) => id)).not.toContain('bia-group');
      expect(own[0]).toHaveProperty('key');
      expect(own[0]).toHaveProperty('parentId');
      expect(own[0]).toHaveProperty('color');
    });
  });
});

describe('category request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: object, metatype: new () => object) =>
    pipe.transform(body, { type: 'body', metatype });
  const group = {
    name: 'Freelas',
    type: 'INCOME',
    icon: 'laptop',
    color: '#12B886',
  };

  it('accepts a group and a subcategory', async () => {
    await expect(validate(group, CreateCategoryDto)).resolves.toEqual(group);
    const sub = {
      name: 'Ração',
      parentId: '11111111-1111-1111-1111-111111111111',
    };
    await expect(validate(sub, CreateCategoryDto)).resolves.toEqual(sub);
  });

  it.each([
    ['a group without an icon', { ...group, icon: undefined }],
    ['a group without a color', { ...group, color: undefined }],
    ['a group without a type', { ...group, type: undefined }],
    ['a color that is not a hex', { ...group, color: 'red' }],
    ['an icon with spaces', { ...group, icon: 'Not An Icon' }],
    ['an empty name', { ...group, name: '' }],
    ['a parent that is not a uuid', { name: 'X', parentId: 'abc' }],
  ])('rejects %s with 400', async (_, body) => {
    await expect(validate(body, CreateCategoryDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires a name on update and a uuid destination on delete', async () => {
    await expect(validate({}, UpdateCategoryDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      validate({ destinationCategoryId: 'x' }, DeleteCategoryDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
