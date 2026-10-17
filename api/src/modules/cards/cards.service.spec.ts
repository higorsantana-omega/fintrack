import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CardsService } from './cards.service';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';
import {
  CardWithRelations,
  CreditCardsRepository,
} from 'src/database/repositories/credit-cards.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { CreateCardDto } from './dto/create-card.dto';

const ANA = '11111111-1111-1111-1111-111111111111';
const BIA = '22222222-2222-2222-2222-222222222222';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);
const monthDate = (value: string) => day(`${value}-01`);

type Purchase = CardWithRelations['purchases'][number];
type Payment = CardWithRelations['payments'][number];
type Rule = CardWithRelations['recurringCharges'][number];

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

function purchase(
  month: string,
  value: number,
  overrides: Partial<Purchase> = {},
): Purchase {
  return {
    id: nextId('purchase'),
    kind: 'PURCHASE',
    description: 'Mercado',
    totalValue: value,
    purchaseDate: noon(`${month}-01`),
    installmentsCount: 1,
    currentInstallment: 1,
    anchorInvoiceMonth: null,
    recurringChargeId: null,
    category: null,
    installments: [{ number: 1, value, invoiceMonth: monthDate(month) }],
    ...overrides,
  };
}

function payment(
  month: string,
  value: number,
  bankAccountId = 'itau',
): Payment {
  return {
    id: nextId('payment'),
    name: `Fatura Nubank ${month}`,
    bankAccountId,
    value,
    date: noon(`${month}-08`),
    type: 'EXPENSE',
    cardInvoiceMonth: monthDate(month),
    bankAccount: { id: bankAccountId, name: bankAccountId, color: '#000' },
  };
}

function netflix(overrides: Partial<Rule> = {}): Rule {
  return {
    id: nextId('rule'),
    description: 'Netflix',
    value: 55,
    firstChargeDate: day('2026-09-20'),
    materializedThrough: day('2026-09-20'),
    cancelledAt: null,
    category: null,
    ...overrides,
  };
}

const cardBody = {
  name: 'Nubank',
  color: '#7950F2',
  limit: 10000,
  closingDay: 3,
  dueDay: 10,
};

const bankAccounts = [
  { id: 'itau', userId: ANA, name: 'Itaú' },
  { id: 'inter', userId: ANA, name: 'Inter' },
  { id: 'bia-account', userId: BIA, name: 'Bia' },
];

describe('CardsService', () => {
  let service: CardsService;
  let cards: CardWithRelations[];
  let creditCardsRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let categories: { userId: string; id: string; key: string; type: string }[];

  const ownerOf = (cardId: string) => cards.find((card) => card.id === cardId);

  // Recurring charges go through the real repository over this fake, so the
  // watermark guard of KTD6 is what prevents duplicates.
  function fakePrismaForMaterialization() {
    const tx = {
      recurringCharge: {
        updateMany: async ({ where, data }) => {
          const rule = cards
            .flatMap((card) => card.recurringCharges)
            .find((rule) => rule.id === where.id);
          if (
            rule.materializedThrough.getTime() !==
            where.materializedThrough.getTime()
          ) {
            return { count: 0 };
          }
          rule.materializedThrough = data.materializedThrough;
          return { count: 1 };
        },
      },
      cardPurchase: {
        create: async ({ data }) => {
          const card = ownerOf(data.creditCardId);
          const duplicate = card.purchases.some(
            (existing) =>
              existing.recurringChargeId === data.recurringChargeId &&
              existing.purchaseDate.getTime() === data.purchaseDate.getTime(),
          );
          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError('Unique', {
              code: 'P2002',
              clientVersion: '4.16.1',
            });
          }
          card.purchases.push(
            purchase('2026-01', data.totalValue, {
              description: data.description,
              recurringChargeId: data.recurringChargeId,
              purchaseDate: data.purchaseDate,
              installments: [data.installments.create],
            }),
          );
          return data;
        },
      },
    };

    return {
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
      },
      $transaction: async (callback) => callback(tx),
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
    categories = [
      {
        userId: ANA,
        id: 'ana-card-payment',
        key: 'card_payment',
        type: 'EXPENSE',
      },
      {
        userId: BIA,
        id: 'bia-card-payment',
        key: 'card_payment',
        type: 'EXPENSE',
      },
    ];
    // A payment shows up on the card it is linked to, as the database would.
    transactionsRepository = {
      create: jest.fn(async (data) => {
        const card = ownerOf(data.creditCardId);
        card.payments.push({
          id: nextId('payment'),
          name: data.name,
          bankAccountId: data.bankAccountId,
          value: data.value,
          date: data.date,
          type: data.type,
          cardInvoiceMonth: data.cardInvoiceMonth,
          bankAccount: { id: data.bankAccountId, name: '', color: '' },
        });
        return data;
      }),
    };
    creditCardsRepository = {
      create: jest.fn(async (userId, data, cycle) => {
        const card = makeCard({ userId, ...data, cycles: [cycle] });
        cards.push(card);
        return card;
      }),
      findManyByUserId: jest.fn(async (userId) =>
        cards.filter((card) => card.userId === userId),
      ),
      findFirst: jest.fn(
        async (userId, cardId) =>
          cards.find((card) => card.userId === userId && card.id === cardId) ??
          null,
      ),
      update: jest.fn(async (cardId, data, cycle) => {
        const card = ownerOf(cardId);
        Object.assign(card, data);
        if (cycle) {
          card.cycles = [
            ...card.cycles.filter(
              (existing) => existing.effectiveFrom < cycle.effectiveFrom,
            ),
            cycle,
          ];
        }
        return card;
      }),
      delete: jest.fn(async () => undefined),
      archive: jest.fn(async (cardId, today) => {
        const card = ownerOf(cardId);
        if (card.archivedAt) return false;
        card.archivedAt = new Date();
        card.recurringCharges
          .filter((rule) => !rule.cancelledAt)
          .forEach((rule) => (rule.cancelledAt = today));
        return true;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        ValidateCardOwnershipService,
        ValidateBankAccountOwnershipService,
        { provide: CreditCardsRepository, useValue: creditCardsRepository },
        { provide: TransactionsRepository, useValue: transactionsRepository },
        {
          provide: CategoriesRepository,
          useValue: {
            findByKey: async (userId: string, key: string, type: string) =>
              categories.find(
                (category) =>
                  category.userId === userId &&
                  category.key === key &&
                  category.type === type,
              ) ?? null,
          },
        },
        {
          provide: BankAccountsRepository,
          useValue: {
            findFirst: async (userId: string, bankAccountId: string) =>
              bankAccounts.find(
                (account) =>
                  account.userId === userId && account.id === bankAccountId,
              ) ?? null,
          },
        },
        {
          provide: CardPurchasesRepository,
          useValue: new CardPurchasesRepository(
            fakePrismaForMaterialization() as any,
          ),
        },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
    setToday('2026-10-05T15:00:00.000Z');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('records the first cycle version in the month of the last closed invoice', async () => {
      setToday('2026-10-04T15:00:00.000Z');

      await service.create(ANA, cardBody);

      expect(creditCardsRepository.create).toHaveBeenCalledWith(
        ANA,
        { name: 'Nubank', color: '#7950F2', limit: 10000 },
        { closingDay: 3, dueDay: 10, effectiveFrom: monthDate('2026-10') },
      );
    });
  });

  describe('user scoping', () => {
    it("returns 404 for another user's card on every route", async () => {
      const card = makeCard({ userId: BIA });
      cards.push(card);

      await expect(service.findOne(ANA, card.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.update(ANA, card.id, cardBody),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove(ANA, card.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.archive(ANA, card.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(creditCardsRepository.update).not.toHaveBeenCalled();
      expect(creditCardsRepository.delete).not.toHaveBeenCalled();
      expect(creditCardsRepository.archive).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const invoiceDates = async (cardId: string, month: string) => {
      const { invoices } = await service.findOne(ANA, cardId);
      const invoice = invoices.find((invoice) => invoice.month === month);
      return { closingDate: invoice.closingDate, dueDate: invoice.dueDate };
    };

    it('AE13: changing the days on 10/5 creates the November version and October keeps its dates', async () => {
      const card = makeCard();
      cards.push(card);

      await service.update(ANA, card.id, {
        ...cardBody,
        closingDay: 10,
        dueDay: 17,
      });

      expect(creditCardsRepository.update).toHaveBeenCalledWith(
        card.id,
        { name: 'Nubank', color: '#7950F2', limit: 10000 },
        { closingDay: 10, dueDay: 17, effectiveFrom: monthDate('2026-11') },
      );
      expect(await invoiceDates(card.id, '2026-10')).toEqual({
        closingDate: noon('2026-10-03'),
        dueDate: noon('2026-10-10'),
      });
      expect(await invoiceDates(card.id, '2026-11')).toEqual({
        closingDate: noon('2026-11-10'),
        dueDate: noon('2026-11-17'),
      });
    });

    it('keeps October on 10/3 and 10/10 for a card created on 10/4 and edited on 10/5', async () => {
      setToday('2026-10-04T15:00:00.000Z');
      const created = await service.create(ANA, cardBody);

      setToday('2026-10-05T15:00:00.000Z');
      await service.update(ANA, created.id, {
        ...cardBody,
        closingDay: 10,
        dueDay: 17,
      });

      expect(await invoiceDates(created.id, '2026-10')).toEqual({
        closingDate: noon('2026-10-03'),
        dueDate: noon('2026-10-10'),
      });
      expect((await invoiceDates(created.id, '2026-11')).closingDate).toEqual(
        noon('2026-11-10'),
      );
    });

    it('AE19: changing the days on 10/28 creates the December version', async () => {
      setToday('2026-10-28T15:00:00.000Z');
      const card = makeCard();
      cards.push(card);

      await service.update(ANA, card.id, {
        ...cardBody,
        closingDay: 26,
        dueDay: 2,
      });

      const [, , cycle] = creditCardsRepository.update.mock.calls[0];
      expect(cycle.effectiveFrom).toEqual(monthDate('2026-12'));
    });

    it('records no cycle version when only the name, color or limit change', async () => {
      const card = makeCard();
      cards.push(card);

      await service.update(ANA, card.id, { ...cardBody, limit: 12000 });

      expect(creditCardsRepository.update).toHaveBeenCalledWith(
        card.id,
        { name: 'Nubank', color: '#7950F2', limit: 12000 },
        null,
      );
    });

    it('returns 409 for an archived card', async () => {
      const card = makeCard({ archivedAt: new Date('2026-09-01T12:00:00Z') });
      cards.push(card);

      await expect(
        service.update(ANA, card.id, cardBody),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(creditCardsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a card without entries, along with recurring charges that never charged', async () => {
      const card = makeCard({
        recurringCharges: [
          netflix({
            firstChargeDate: day('2026-11-20'),
            materializedThrough: day('2026-11-19'),
          }),
        ],
      });
      cards.push(card);

      await expect(service.remove(ANA, card.id)).resolves.toBeNull();
      expect(creditCardsRepository.delete).toHaveBeenCalledWith(card.id);
    });

    it.each([
      ['a purchase', { purchases: [purchase('2026-10', 100)] }],
      ['a payment', { payments: [payment('2026-10', 100)] }],
    ])('returns 409 for a card with %s', async (_, overrides) => {
      const card = makeCard(overrides);
      cards.push(card);

      await expect(service.remove(ANA, card.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(creditCardsRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 409 when the database refuses the delete because of a payment (P2003)', async () => {
      const card = makeCard();
      cards.push(card);
      creditCardsRepository.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key', {
          code: 'P2003',
          clientVersion: '4.16.1',
        }),
      );

      await expect(service.remove(ANA, card.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('archive', () => {
    const owedOf = async (cardId: string) => {
      try {
        await service.archive(ANA, cardId);
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        return error.getResponse().owed;
      }
      throw new Error('archive did not fail');
    };

    it('AE12: refuses a card with future installments and tells how much it owes', async () => {
      const card = makeCard({
        purchases: [purchase('2026-11', 400), purchase('2026-12', 400)],
      });
      cards.push(card);

      expect(await owedOf(card.id)).toBe(800);
      expect(creditCardsRepository.archive).not.toHaveBeenCalled();
    });

    it('AE12: archives a card with nothing owed and cancels its recurring charges from today', async () => {
      const rule = netflix({ materializedThrough: day('2026-10-05') });
      const card = makeCard({
        purchases: [purchase('2026-10', 300)],
        payments: [payment('2026-10', 300)],
        recurringCharges: [rule],
      });
      cards.push(card);

      await expect(service.archive(ANA, card.id)).resolves.toBeNull();

      expect(creditCardsRepository.archive).toHaveBeenCalledWith(
        card.id,
        day('2026-10-05'),
      );
      expect(card.archivedAt).toBeInstanceOf(Date);
      expect(rule.cancelledAt).toEqual(day('2026-10-05'));
    });

    it('materializes before checking: a charge from yesterday not yet materialized counts as owed', async () => {
      setToday('2026-10-21T15:00:00.000Z');
      const card = makeCard({
        recurringCharges: [netflix({ materializedThrough: day('2026-09-20') })],
      });
      cards.push(card);

      expect(await owedOf(card.id)).toBe(55);
    });

    it('returns 409 for a card that is already archived', async () => {
      const card = makeCard({ archivedAt: new Date('2026-09-01T12:00:00Z') });
      cards.push(card);

      await expect(service.archive(ANA, card.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(creditCardsRepository.archive).not.toHaveBeenCalled();
    });
  });

  describe('payInvoice', () => {
    const pay = (
      cardId: string,
      month: string,
      value: number,
      bankAccountId = 'itau',
      date = '2026-10-08T15:00:00.000Z',
    ) => service.payInvoice(ANA, cardId, month, { bankAccountId, value, date });

    it('AE4: a R$ 1.000 payment by Itaú is a "Fatura de cartão" expense linked to the invoice, and a second one by Inter pays it off', async () => {
      const card = makeCard({ purchases: [purchase('2026-10', 1230)] });
      cards.push(card);

      await pay(card.id, '2026-10', 1000, 'itau');

      expect(transactionsRepository.create).toHaveBeenCalledWith({
        userId: ANA,
        bankAccountId: 'itau',
        categoryId: 'ana-card-payment',
        creditCardId: card.id,
        cardInvoiceMonth: monthDate('2026-10'),
        name: 'Fatura Nubank outubro',
        value: 1000,
        date: noon('2026-10-08'),
        type: 'EXPENSE',
      });

      await pay(card.id, '2026-10', 230, 'inter');

      const { invoices } = await service.findOne(ANA, card.id);
      expect(
        invoices.find((invoice) => invoice.month === '2026-10'),
      ).toMatchObject({ balance: 0, status: 'PAID', canPay: false });
      expect(transactionsRepository.create.mock.calls[1][0]).toMatchObject({
        bankAccountId: 'inter',
        name: 'Fatura Nubank outubro',
      });
    });

    it.each([
      ['a future invoice', '2026-12'],
      ['a paid invoice', '2026-09'],
    ])('returns 409 for %s', async (_, month) => {
      const card = makeCard({
        purchases: [purchase('2026-09', 100), purchase('2026-12', 100)],
        payments: [payment('2026-09', 100)],
      });
      cards.push(card);

      await expect(pay(card.id, month, 50)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('refuses a month after the open invoice without computing the invoices up to it', async () => {
      const card = makeCard({
        purchases: [purchase('2026-10', 100)],
        recurringCharges: Array.from({ length: 20 }, () =>
          netflix({ materializedThrough: day('2026-10-05') }),
        ),
      });
      cards.push(card);
      const startedAt = performance.now();

      await expect(pay(card.id, '9999-12', 50)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(performance.now() - startedAt).toBeLessThan(1000);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 for a payment dated more than ten years away from today', async () => {
      const card = makeCard({ purchases: [purchase('2026-10', 100)] });
      cards.push(card);

      await expect(
        pay(card.id, '2026-10', 50, 'itau', '0100-01-15T15:00:00.000Z'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('AE18: accepts paying an archived card invoice that has a balance, and refuses one without', async () => {
      const card = makeCard({
        archivedAt: new Date('2026-09-15T12:00:00Z'),
        purchases: [purchase('2026-09', 300), purchase('2026-10', 100)],
        payments: [payment('2026-10', 100)],
      });
      cards.push(card);

      await pay(card.id, '2026-09', 300);
      expect(transactionsRepository.create).toHaveBeenCalledTimes(1);

      await expect(pay(card.id, '2026-10', 10)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(transactionsRepository.create).toHaveBeenCalledTimes(1);
    });

    it("returns 404 for another user's bank account", async () => {
      const card = makeCard({ purchases: [purchase('2026-10', 100)] });
      cards.push(card);

      await expect(
        pay(card.id, '2026-10', 100, 'bia-account'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('fails and records nothing when only another user has the "Fatura de cartão" category', async () => {
      categories = categories.filter((category) => category.userId === BIA);
      const card = makeCard({ purchases: [purchase('2026-10', 100)] });
      cards.push(card);

      await expect(pay(card.id, '2026-10', 100)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('names a December/2026 invoice paid in 2027 "Fatura Nubank dezembro/2026"', async () => {
      setToday('2027-01-05T15:00:00.000Z');
      const card = makeCard({ purchases: [purchase('2026-12', 100)] });
      cards.push(card);

      await pay(card.id, '2026-12', 100, 'itau', '2027-01-05T15:00:00.000Z');

      expect(transactionsRepository.create.mock.calls[0][0].name).toBe(
        'Fatura Nubank dezembro/2026',
      );
    });
  });

  describe('findReminders', () => {
    it('lists the invoices in reminder by due date, leaving out archived cards and paid invoices', async () => {
      setToday('2026-10-06T15:00:00.000Z');
      const inter = makeCard({
        name: 'Inter',
        cycles: [
          { closingDay: 1, dueDay: 8, effectiveFrom: monthDate('2026-01') },
        ],
        purchases: [purchase('2026-10', 70)],
        payments: [payment('2026-10', 20, 'inter')],
      });
      const nubank = makeCard({
        purchases: [purchase('2026-09', 50), purchase('2026-10', 1230)],
      });
      cards.push(
        nubank,
        inter,
        makeCard({
          name: 'Pago',
          purchases: [purchase('2026-10', 10)],
          payments: [payment('2026-10', 10)],
        }),
        makeCard({
          name: 'Arquivado',
          archivedAt: new Date('2026-09-01T12:00:00Z'),
          purchases: [purchase('2026-10', 10)],
        }),
      );

      const reminders = await service.findReminders(ANA);

      expect(
        reminders.map((reminder) => [
          reminder.cardName,
          reminder.month,
          reminder.balance,
          reminder.status,
        ]),
      ).toEqual([
        ['Nubank', '2026-09', 50, 'OVERDUE'],
        ['Inter', '2026-10', 50, 'CLOSED'],
        ['Nubank', '2026-10', 1230, 'CLOSED'],
      ]);
      expect(reminders[1]).toMatchObject({
        cardId: inter.id,
        dueDate: noon('2026-10-08'),
        lastPaymentBankAccountId: 'inter',
      });
    });
  });

  describe('reads', () => {
    it('creates a charge due up to today and its installment once, even across repeated and concurrent reads', async () => {
      setToday('2026-10-21T15:00:00.000Z');
      const card = makeCard({ recurringCharges: [netflix()] });
      cards.push(card);

      await Promise.all([
        service.findAllByUserId(ANA),
        service.getSummary(ANA),
        service.findOne(ANA, card.id),
      ]);
      await service.findAllByUserId(ANA);

      expect(card.purchases).toHaveLength(1);
      expect(card.purchases[0]).toMatchObject({
        description: 'Netflix',
        purchaseDate: noon('2026-10-20'),
        installments: [
          { number: 1, value: 55, invoiceMonth: monthDate('2026-11') },
        ],
      });
    });

    it('keeps reading when another request already created the charge (P2002)', async () => {
      setToday('2026-10-21T15:00:00.000Z');
      const rule = netflix();
      const card = makeCard({
        recurringCharges: [rule],
        purchases: [
          purchase('2026-11', 55, {
            recurringChargeId: rule.id,
            purchaseDate: noon('2026-10-20'),
          }),
        ],
      });
      cards.push(card);

      await expect(service.findAllByUserId(ANA)).resolves.toHaveLength(1);
      expect(card.purchases).toHaveLength(1);
    });

    it('sums only the invoices due this month of non-archived cards, and leaves archived cards out of the summed limit', async () => {
      cards.push(
        makeCard({
          limit: 5000,
          purchases: [purchase('2026-10', 1230), purchase('2026-11', 99)],
        }),
        makeCard({
          limit: 2000,
          cycles: [
            { closingDay: 25, dueDay: 30, effectiveFrom: monthDate('2026-01') },
          ],
          purchases: [purchase('2026-10', 70)],
        }),
        makeCard({
          limit: 9000,
          archivedAt: new Date('2026-09-01T12:00:00Z'),
          purchases: [purchase('2026-10', 500)],
        }),
        makeCard({ userId: BIA, purchases: [purchase('2026-10', 1)] }),
      );

      const summary = await service.getSummary(ANA);

      expect(summary).toMatchObject({
        invoicesTotal: 1300,
        limit: { total: 7000, used: 1399, available: 5601 },
      });
      expect(summary.invoicesByMonth).toHaveLength(13);
    });

    it('AE18: lists archived cards after the active ones, showing what an archived card owes', async () => {
      const archived = makeCard({
        name: 'Antigo',
        archivedAt: new Date('2026-09-01T12:00:00Z'),
        purchases: [purchase('2026-09', 200)],
      });
      const active = makeCard({ name: 'Nubank' });
      cards.push(archived, active);

      const list = await service.findAllByUserId(ANA);

      expect(list.map((card) => [card.name, card.owed])).toEqual([
        ['Nubank', 0],
        ['Antigo', 200],
      ]);
      expect(list[1].archivedAt).toEqual(archived.archivedAt);
    });

    it('returns the card page: the strip with entries and payments, the selected invoice, active recurring charges and the last payment account', async () => {
      const cancelled = netflix({
        description: 'Spotify',
        cancelledAt: day('2026-09-25'),
      });
      const active = netflix({ materializedThrough: day('2026-10-05') });
      const card = makeCard({
        purchases: [
          purchase('2026-08', 120, { description: 'Atrasada' }),
          purchase('2026-10', 1000, {
            description: 'Notebook',
            totalValue: 2000,
            installmentsCount: 2,
            installments: [
              { number: 1, value: 1000, invoiceMonth: monthDate('2026-10') },
              { number: 2, value: 1000, invoiceMonth: monthDate('2026-11') },
            ],
          }),
        ],
        payments: [
          payment('2026-10', 400, 'itau'),
          payment('2026-10', 100, 'inter'),
        ],
        recurringCharges: [cancelled, active],
      });
      cards.push(card);

      const page = await service.findOne(ANA, card.id);

      expect(page.selectedMonth).toBe('2026-08');
      expect(page.invoices[0].month).toBe('2026-04');
      expect(page.invoices[page.invoices.length - 1].month).toBe('2027-04');
      expect(page.lastPaymentBankAccountId).toBe('inter');
      expect(page.recurringCharges.map((rule) => rule.id)).toEqual([active.id]);

      const october = page.invoices.find(
        (invoice) => invoice.month === '2026-10',
      );
      expect(october).toMatchObject({
        total: 1000,
        paid: 500,
        balance: 500,
        status: 'CLOSED',
        canPay: true,
      });
      expect(october.payments.map((payment) => payment.value)).toEqual([
        400, 100,
      ]);
      expect(
        october.entries.map((entry) => [
          entry.description,
          entry.installmentNumber,
          entry.installmentsCount,
        ]),
      ).toEqual([['Notebook', 1, 2]]);

      const november = page.invoices.find(
        (invoice) => invoice.month === '2026-11',
      );
      expect(
        november.entries.map((entry) => [entry.description, entry.isForecast]),
      ).toEqual([
        ['Notebook', false],
        ['Netflix', true],
      ]);
      expect(november).toMatchObject({
        total: 1000,
        forecast: 55,
        value: 1055,
      });
    });
  });
});

describe('card request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: object) =>
    pipe.transform(body, { type: 'body', metatype: CreateCardDto });

  it.each([
    ['closing day 0', { ...cardBody, closingDay: 0 }],
    ['closing day 32', { ...cardBody, closingDay: 32 }],
    ['due day 0', { ...cardBody, dueDay: 0 }],
    ['due day 32', { ...cardBody, dueDay: 32 }],
    ['a limit with three decimals', { ...cardBody, limit: 10.555 }],
    ['a zero limit', { ...cardBody, limit: 0 }],
  ])('rejects %s with 400', async (_, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts days 1 to 31 and a two-decimal limit', async () => {
    const body = { ...cardBody, closingDay: 1, dueDay: 31, limit: 10.55 };

    await expect(validate(body)).resolves.toEqual(body);
  });
});
