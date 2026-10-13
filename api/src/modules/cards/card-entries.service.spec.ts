import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CardEntriesService } from './card-entries.service';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';
import {
  CardWithRelations,
  CreditCardsRepository,
} from 'src/database/repositories/credit-cards.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { RecurringChargesRepository } from 'src/database/repositories/recurring-charges.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { formatMonthKey, getMonthKey } from 'src/shared/calendar';
import {
  CardPurchaseKind,
  CreateCardPurchaseDto,
} from './dto/create-card-purchase.dto';
import { getLimit } from './card-calculations';

const ANA = '11111111-1111-1111-1111-111111111111';
const BIA = '22222222-2222-2222-2222-222222222222';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);
const monthDate = (value: string) => day(`${value}-01`);

type Purchase = CardWithRelations['purchases'][number];
type Rule = CardWithRelations['recurringCharges'][number];

const categories = [
  {
    id: 'food',
    userId: ANA,
    name: 'Alimentação',
    icon: 'food',
    type: 'EXPENSE',
  },
  { id: 'salary', userId: ANA, name: 'Salary', icon: 'salary', type: 'INCOME' },
  { id: 'goal', userId: ANA, name: 'Metas', icon: 'goal', type: 'EXPENSE' },
  {
    id: 'card-payment',
    userId: ANA,
    name: 'Fatura de cartão',
    icon: 'credit-card',
    type: 'EXPENSE',
  },
  {
    id: 'bia-food',
    userId: BIA,
    name: 'Comida',
    icon: 'food',
    type: 'EXPENSE',
  },
];

const categoryView = (categoryId: string | null) => {
  const category = categories.find(({ id }) => id === categoryId);
  return category
    ? { id: category.id, name: category.name, icon: category.icon }
    : null;
};

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

function makeCard(overrides: Partial<CardWithRelations> = {}) {
  const card: CardWithRelations = {
    id: nextId('card'),
    userId: ANA,
    name: 'Nubank',
    color: '#7950F2',
    limit: 10000,
    archivedAt: null,
    createdAt: new Date('2026-01-10T15:00:00.000Z'),
    cycles: [
      { closingDay: 3, dueDay: 10, effectiveFrom: monthDate('2026-01') },
    ],
    purchases: [],
    payments: [],
    recurringCharges: [],
    ...overrides,
  };
  return card;
}

function netflix(overrides: Partial<Rule> = {}): Rule {
  return {
    id: nextId('rule'),
    description: 'Netflix',
    value: 55,
    firstChargeDate: day('2026-09-20'),
    materializedThrough: day('2026-09-19'),
    cancelledAt: null,
    category: categoryView('food'),
    ...overrides,
  };
}

const months = (purchase: Purchase) =>
  purchase.installments.map(({ number, value, invoiceMonth }) => [
    number,
    value,
    formatMonthKey(getMonthKey(invoiceMonth)),
  ]);

describe('CardEntriesService', () => {
  let service: CardEntriesService;
  let cards: CardWithRelations[];
  let transactions: number;

  const allPurchases = () => cards.flatMap((card) => card.purchases);
  const findPurchase = (purchaseId: string) =>
    allPurchases().find(({ id }) => id === purchaseId);
  const findRule = (ruleId: string) =>
    cards
      .flatMap((card) => card.recurringCharges)
      .find(({ id }) => id === ruleId);

  // In-memory stand-in for the Prisma calls of the card repositories.
  // Installment rows are only writable inside `$transaction`.
  function fakePrisma() {
    const recurringCharge = {
      updateMany: async ({ where, data }) => {
        const rule = findRule(where.id);
        if (
          (where.cancelledAt === null && rule.cancelledAt) ||
          rule.materializedThrough.getTime() !==
            where.materializedThrough.getTime()
        ) {
          return { count: 0 };
        }
        Object.assign(rule, data);
        return { count: 1 };
      },
    };
    const cardPurchase = {
      create: async ({ data }) => {
        const { creditCardId, categoryId, installments, ...fields } = data;
        const card = cards.find(({ id }) => id === creditCardId);
        if (
          fields.recurringChargeId &&
          card.purchases.some(
            (existing: any) =>
              existing.recurringChargeId === fields.recurringChargeId &&
              existing.occurrenceDate?.getTime() ===
                fields.occurrenceDate.getTime(),
          )
        ) {
          throw new Prisma.PrismaClientKnownRequestError('Unique', {
            code: 'P2002',
            clientVersion: '4.16.1',
          });
        }
        const row = {
          id: nextId('purchase'),
          installmentsCount: 1,
          currentInstallment: 1,
          anchorInvoiceMonth: null,
          recurringChargeId: null,
          ...fields,
          category: categoryView(categoryId),
          installments: [installments.create].flat(),
        };
        card.purchases.push(row);
        return row;
      },
    };
    const tx = {
      recurringCharge,
      cardPurchase: {
        ...cardPurchase,
        update: async ({ where, data }) => {
          const { categoryId, ...fields } = data;
          return Object.assign(findPurchase(where.id), fields, {
            category: categoryView(categoryId),
          });
        },
      },
      cardInstallment: {
        deleteMany: async ({ where }) => {
          findPurchase(where.purchaseId).installments = [];
        },
        createMany: async ({ data }) =>
          data.forEach(({ purchaseId, number, value, invoiceMonth }) =>
            findPurchase(purchaseId).installments.push({
              number,
              value,
              invoiceMonth,
            }),
          ),
      },
    };

    return {
      $transaction: async (callback) => {
        transactions += 1;
        return callback(tx);
      },
      recurringCharge: {
        findMany: async ({ where }) =>
          cards
            .filter((card) => card.userId === where.creditCard.userId)
            .flatMap((card) =>
              card.recurringCharges
                .filter(
                  (rule) =>
                    rule.materializedThrough < where.materializedThrough.lt,
                )
                .map((rule) => ({
                  ...rule,
                  creditCardId: card.id,
                  categoryId: rule.category?.id ?? null,
                  creditCard: { cycles: card.cycles },
                })),
            ),
        create: async ({ data }) => {
          const { creditCardId, categoryId, ...fields } = data;
          const rule = {
            id: nextId('rule'),
            cancelledAt: null,
            ...fields,
            category: categoryView(categoryId),
          };
          cards
            .find(({ id }) => id === creditCardId)
            .recurringCharges.push(rule);
          return rule;
        },
        update: async ({ where, data }) => {
          const { categoryId, ...fields } = data;
          return Object.assign(findRule(where.id), fields, {
            category: categoryView(categoryId),
          });
        },
      },
      cardPurchase: {
        create: cardPurchase.create,
        delete: async ({ where }) => {
          cards.forEach((card) => {
            card.purchases = card.purchases.filter(({ id }) => id !== where.id);
          });
        },
      },
    };
  }

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
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });
  }

  beforeEach(async () => {
    cards = [];
    transactions = 0;
    const prisma = fakePrisma() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardEntriesService,
        ValidateCardOwnershipService,
        {
          provide: CreditCardsRepository,
          useValue: {
            findFirst: async (userId: string, cardId: string) =>
              cards.find(
                (card) => card.userId === userId && card.id === cardId,
              ) ?? null,
          },
        },
        {
          provide: CardPurchasesRepository,
          useValue: new CardPurchasesRepository(prisma),
        },
        {
          provide: RecurringChargesRepository,
          useValue: new RecurringChargesRepository(prisma),
        },
        {
          provide: CategoriesRepository,
          useValue: {
            findFirst: async (userId: string, categoryId: string) =>
              categories.find(
                (category) =>
                  category.userId === userId && category.id === categoryId,
              ) ?? null,
          },
        },
      ],
    }).compile();

    service = module.get<CardEntriesService>(CardEntriesService);
    // October closed on 10/3; November is the open invoice.
    setToday('2026-10-05T15:00:00.000Z');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const single = (overrides: Partial<CreateCardPurchaseDto> = {}) => ({
    kind: CardPurchaseKind.PURCHASE,
    description: 'Mercado',
    categoryId: 'food',
    value: 100,
    date: '2026-10-02T15:00:00.000Z',
    ...overrides,
  });

  const notebookInProgress = (overrides: Partial<CreateCardPurchaseDto> = {}) =>
    single({
      description: 'Notebook',
      value: 400,
      date: '2026-06-20T15:00:00.000Z',
      installmentsCount: 10,
      currentInstallment: 4,
      anchorInvoiceMonth: '2026-10',
      ...overrides,
    });

  describe('purchases', () => {
    it('AE1: a purchase on 10/2 is stored with one installment in the October invoice', async () => {
      const card = makeCard();
      cards.push(card);

      await service.createPurchase(ANA, card.id, single());

      expect(card.purchases[0]).toMatchObject({
        kind: 'PURCHASE',
        totalValue: 100,
        purchaseDate: noon('2026-10-02'),
        installmentsCount: 1,
      });
      expect(months(card.purchases[0])).toEqual([[1, 100, '2026-10']]);
    });

    it('AE2: R$ 1.000 in 3x stores the three installments with their values and months', async () => {
      const card = makeCard();
      cards.push(card);

      await service.createPurchase(
        ANA,
        card.id,
        single({
          value: 1000,
          date: '2026-10-15T15:00:00.000Z',
          installmentsCount: 3,
        }),
      );

      expect(months(card.purchases[0])).toEqual([
        [1, 333.34, '2026-11'],
        [2, 333.33, '2026-12'],
        [3, 333.33, '2027-01'],
      ]);
    });

    it('AE3: a purchase in progress anchored in October stores installments 4 to 10', async () => {
      const card = makeCard();
      cards.push(card);

      await service.createPurchase(ANA, card.id, notebookInProgress());

      const [notebook] = card.purchases;
      expect(notebook).toMatchObject({
        totalValue: 4000,
        installmentsCount: 10,
        currentInstallment: 4,
        anchorInvoiceMonth: monthDate('2026-10'),
      });
      expect(months(notebook)).toEqual([
        [4, 400, '2026-10'],
        [5, 400, '2026-11'],
        [6, 400, '2026-12'],
        [7, 400, '2027-01'],
        [8, 400, '2027-02'],
        [9, 400, '2027-03'],
        [10, 400, '2027-04'],
      ]);
      expect(getLimit(card).used).toBe(2800);
    });

    it.each([
      [
        'an anchor in September, when the last closed invoice is October',
        { anchorInvoiceMonth: '2026-09' },
      ],
      ['an anchor in December', { anchorInvoiceMonth: '2026-12' }],
      [
        'an original date after the closing of the anchor',
        { date: '2026-10-04T15:00:00.000Z' },
      ],
      [
        'a current installment above the number of installments',
        { currentInstallment: 11 },
      ],
      ['no number of installments', { installmentsCount: undefined }],
    ])('returns 400 for %s', async (_, overrides) => {
      const card = makeCard();
      cards.push(card);

      await expect(
        service.createPurchase(ANA, card.id, notebookInProgress(overrides)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(card.purchases).toEqual([]);
    });

    it('AE17: correcting the current installment from 4 to 5 regenerates the installments from October, keeping the anchor', async () => {
      const card = makeCard();
      cards.push(card);
      await service.createPurchase(ANA, card.id, notebookInProgress());
      const [notebook] = card.purchases;

      await service.updatePurchase(ANA, card.id, notebook.id, {
        description: 'Notebook',
        categoryId: 'food',
        value: 400,
        date: '2026-06-20T15:00:00.000Z',
        installmentsCount: 10,
        currentInstallment: 5,
      });

      expect(notebook.anchorInvoiceMonth).toEqual(monthDate('2026-10'));
      expect(
        months(notebook).map(([number, , month]) => [number, month]),
      ).toEqual([
        [5, '2026-10'],
        [6, '2026-11'],
        [7, '2026-12'],
        [8, '2027-01'],
        [9, '2027-02'],
        [10, '2027-03'],
      ]);
    });

    it('regenerates the installments in one transaction when the total changes', async () => {
      const card = makeCard();
      cards.push(card);
      await service.createPurchase(
        ANA,
        card.id,
        single({ value: 1000, installmentsCount: 2 }),
      );
      const [purchase] = card.purchases;
      transactions = 0;

      await service.updatePurchase(ANA, card.id, purchase.id, {
        description: 'Mercado',
        categoryId: 'food',
        value: 1500,
        date: '2026-10-02T15:00:00.000Z',
        installmentsCount: 2,
      });

      expect(transactions).toBe(1);
      expect(purchase.totalValue).toBe(1500);
      expect(months(purchase)).toEqual([
        [1, 750, '2026-10'],
        [2, 750, '2026-11'],
      ]);
    });

    it('keeps the installment rows when only the description changes', async () => {
      const card = makeCard();
      cards.push(card);
      await service.createPurchase(
        ANA,
        card.id,
        single({ value: 1000, installmentsCount: 2 }),
      );
      const [purchase] = card.purchases;
      const rows = purchase.installments;

      await service.updatePurchase(ANA, card.id, purchase.id, {
        description: 'Supermercado',
        categoryId: 'food',
        value: 1000,
        date: '2026-10-02T15:00:00.000Z',
        installmentsCount: 2,
      });

      expect(purchase.description).toBe('Supermercado');
      expect(purchase.installments).toBe(rows);
    });

    it('moves a single purchase to the invoice of its new date', async () => {
      const card = makeCard();
      cards.push(card);
      await service.createPurchase(ANA, card.id, single());
      const [purchase] = card.purchases;

      await service.updatePurchase(ANA, card.id, purchase.id, {
        description: 'Mercado',
        categoryId: 'food',
        value: 100,
        date: '2026-10-03T15:00:00.000Z',
      });

      expect(months(purchase)).toEqual([[1, 100, '2026-11']]);
    });

    it('returns 400 when an edit turns a single purchase into installments', async () => {
      const card = makeCard();
      cards.push(card);
      await service.createPurchase(ANA, card.id, single());

      await expect(
        service.updatePurchase(ANA, card.id, card.purchases[0].id, {
          description: 'Mercado',
          categoryId: 'food',
          value: 100,
          date: '2026-10-02T15:00:00.000Z',
          installmentsCount: 2,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('AE7: deleting an installment purchase removes it with every installment', async () => {
      const card = makeCard();
      cards.push(card);
      await service.createPurchase(
        ANA,
        card.id,
        single({ value: 1000, installmentsCount: 10 }),
      );

      await expect(
        service.removePurchase(ANA, card.id, card.purchases[0].id),
      ).resolves.toBeNull();

      expect(card.purchases).toEqual([]);
      expect(getLimit(card).used).toBe(0);
    });

    it('returns 404 for another user\'s category, and 400 for an income, "Metas" or "Fatura de cartão" category', async () => {
      const card = makeCard();
      cards.push(card);

      await expect(
        service.createPurchase(
          ANA,
          card.id,
          single({ categoryId: 'bia-food' }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      for (const categoryId of ['salary', 'goal', 'card-payment']) {
        await expect(
          service.createPurchase(ANA, card.id, single({ categoryId })),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(card.purchases).toEqual([]);
    });

    it('accepts a refund without a category in the invoice of its date', async () => {
      const card = makeCard();
      cards.push(card);

      await service.createPurchase(
        ANA,
        card.id,
        single({
          kind: CardPurchaseKind.REFUND,
          categoryId: undefined,
          value: 80,
          date: '2026-10-04T15:00:00.000Z',
        }),
      );

      expect(card.purchases[0]).toMatchObject({
        kind: 'REFUND',
        category: null,
      });
      expect(months(card.purchases[0])).toEqual([[1, 80, '2026-11']]);
      expect(getLimit(card).used).toBe(-80);
    });

    it('returns 400 for a refund in installments', async () => {
      const card = makeCard();
      cards.push(card);

      await expect(
        service.createPurchase(
          ANA,
          card.id,
          single({ kind: CardPurchaseKind.REFUND, installmentsCount: 2 }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      ['in the year 100', '0100-01-15T15:00:00.000Z'],
      ['twenty years ahead', '2046-10-05T15:00:00.000Z'],
    ])('returns 400 for a purchase dated %s', async (_, date) => {
      const card = makeCard();
      cards.push(card);

      await expect(
        service.createPurchase(ANA, card.id, single({ date })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(card.purchases).toEqual([]);
    });

    it('AE9: records a purchase above the available limit', async () => {
      const card = makeCard({ limit: 300 });
      cards.push(card);

      await service.createPurchase(ANA, card.id, single({ value: 500 }));

      expect(getLimit(card).available).toBe(-200);
    });
  });

  describe('recurring charges', () => {
    it('returns 400 for a first charge before the start of the last closed invoice', async () => {
      const card = makeCard();
      cards.push(card);
      const body = {
        description: 'Netflix',
        value: 55,
        categoryId: 'food',
        firstChargeDate: '2026-09-02T15:00:00.000Z',
      };

      await expect(
        service.createRecurringCharge(ANA, card.id, body),
      ).rejects.toBeInstanceOf(BadRequestException);

      await service.createRecurringCharge(ANA, card.id, {
        ...body,
        firstChargeDate: '2026-09-03T15:00:00.000Z',
      });
      expect(card.recurringCharges[0]).toMatchObject({
        firstChargeDate: day('2026-09-03'),
        materializedThrough: day('2026-09-02'),
        cancelledAt: null,
      });
    });

    it('AE8: changing the value keeps the charge already due with the old value', async () => {
      setToday('2026-10-25T15:00:00.000Z');
      const rule = netflix({
        firstChargeDate: day('2026-10-20'),
        materializedThrough: day('2026-10-19'),
      });
      const card = makeCard({ recurringCharges: [rule] });
      cards.push(card);

      await service.updateRecurringCharge(ANA, card.id, rule.id, {
        description: 'Netflix',
        value: 60,
        categoryId: 'food',
      });

      expect(rule.value).toBe(60);
      expect(card.purchases).toHaveLength(1);
      expect(card.purchases[0]).toMatchObject({
        totalValue: 55,
        purchaseDate: noon('2026-10-20'),
      });
    });

    it('AE14: a deleted charge does not come back on the next read', async () => {
      setToday('2026-10-21T15:00:00.000Z');
      const rule = netflix({ materializedThrough: day('2026-09-20') });
      const card = makeCard({ recurringCharges: [rule] });
      cards.push(card);
      const repository = new CardPurchasesRepository(fakePrisma() as any);
      await repository.materializeRecurringCharges(ANA, day('2026-10-21'));
      expect(card.purchases).toHaveLength(1);

      await service.removePurchase(ANA, card.id, card.purchases[0].id);
      await repository.materializeRecurringCharges(ANA, day('2026-10-21'));

      expect(card.purchases).toEqual([]);
    });

    it('cancelling on the 20th, before that day charge is created, records the earlier charges but not that one', async () => {
      setToday('2026-10-20T15:00:00.000Z');
      const rule = netflix();
      const card = makeCard({ recurringCharges: [rule] });
      cards.push(card);

      await expect(
        service.cancelRecurringCharge(ANA, card.id, rule.id),
      ).resolves.toBeNull();

      expect(rule.cancelledAt).toEqual(day('2026-10-20'));
      expect(card.purchases.map(({ purchaseDate }) => purchaseDate)).toEqual([
        noon('2026-09-20'),
      ]);
    });

    it('returns 409 when cancelling a rule that is already cancelled', async () => {
      const rule = netflix({ cancelledAt: day('2026-10-01') });
      const card = makeCard({ recurringCharges: [rule] });
      cards.push(card);

      await expect(
        service.cancelRecurringCharge(ANA, card.id, rule.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('returns 409 for every write on an archived card', async () => {
    const rule = netflix({ materializedThrough: day('2026-10-05') });
    const card = makeCard({
      archivedAt: new Date('2026-09-01T12:00:00Z'),
      recurringCharges: [rule],
    });
    cards.push(card);
    card.purchases.push({
      id: 'old-purchase',
      kind: 'PURCHASE',
      description: 'Antiga',
      totalValue: 10,
      purchaseDate: noon('2026-08-10'),
      installmentsCount: 1,
      currentInstallment: 1,
      anchorInvoiceMonth: null,
      recurringChargeId: null,
      category: null,
      installments: [
        { number: 1, value: 10, invoiceMonth: monthDate('2026-09') },
      ],
    });
    const recurringBody = {
      description: 'Netflix',
      value: 55,
      categoryId: 'food',
    };

    const writes = [
      () => service.createPurchase(ANA, card.id, single()),
      () =>
        service.updatePurchase(ANA, card.id, 'old-purchase', {
          description: 'Antiga',
          value: 10,
          date: '2026-08-10T15:00:00.000Z',
          categoryId: 'food',
        }),
      () => service.removePurchase(ANA, card.id, 'old-purchase'),
      () =>
        service.createRecurringCharge(ANA, card.id, {
          ...recurringBody,
          firstChargeDate: '2026-10-05T15:00:00.000Z',
        }),
      () => service.updateRecurringCharge(ANA, card.id, rule.id, recurringBody),
      () => service.cancelRecurringCharge(ANA, card.id, rule.id),
    ];

    for (const write of writes) {
      await expect(write()).rejects.toBeInstanceOf(ConflictException);
    }
    expect(card.purchases.map(({ id }) => id)).toEqual(['old-purchase']);
    expect(rule.cancelledAt).toBeNull();
  });

  it("returns 404 for another user's card", async () => {
    const card = makeCard({ userId: BIA });
    cards.push(card);

    await expect(
      service.createPurchase(ANA, card.id, single()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(card.purchases).toEqual([]);
  });
});

describe('card entry request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: object) =>
    pipe.transform(body, { type: 'body', metatype: CreateCardPurchaseDto });
  const body = {
    kind: 'PURCHASE',
    description: 'Mercado',
    categoryId: '33333333-3333-3333-3333-333333333333',
    value: 100,
    date: '2026-10-02T15:00:00.000Z',
  };

  it.each([1, 49])(
    'rejects an installment purchase with N = %p with 400',
    async (installmentsCount) => {
      await expect(
        validate({ ...body, installmentsCount }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects a purchase without a category and a value with three decimals', async () => {
    await expect(
      validate({ ...body, categoryId: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate({ ...body, value: 10.555 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts 2 to 48 installments and a refund without a category', async () => {
    await expect(validate({ ...body, installmentsCount: 48 })).resolves.toEqual(
      {
        ...body,
        installmentsCount: 48,
      },
    );
    const refund = { ...body, kind: 'REFUND', categoryId: undefined };
    await expect(validate(refund)).resolves.toMatchObject({ kind: 'REFUND' });
  });
});
