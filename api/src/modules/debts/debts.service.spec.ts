import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DebtsService } from './debts.service';
import { ValidateDebtOwnershipService } from './validate-debt-ownership.service';
import {
  DebtWithRelations,
  DebtsRepository,
} from 'src/database/repositories/debts.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { getNewInstallmentRows } from './debt-calculations';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { UpdateExpectedValueDto } from './dto/update-expected-value.dto';

const ANA = '11111111-1111-1111-1111-111111111111';
const BIA = '22222222-2222-2222-2222-222222222222';

const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);
const monthDate = (value: string) => new Date(`${value}-01T00:00:00.000Z`);

type Row = DebtWithRelations['installments'][number];
type Linked = DebtWithRelations['transactions'][number];

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

// The Carro of the plan: 48 installments of R$ 1.200 due on the 10th, with
// installment 19 due in November 2026.
function makeDebt(overrides: Partial<DebtWithRelations> = {}) {
  const debt: DebtWithRelations = {
    id: nextId('debt'),
    userId: ANA,
    name: 'Carro',
    dueDay: 10,
    createdAt: new Date('2026-01-10T15:00:00.000Z'),
    installments: getNewInstallmentRows({
      installmentsCount: 48,
      nextInstallment: 19,
      nextDueMonth: 2026 * 12 + 10,
      expectedValue: 1200,
    }).map((row) => ({ ...row, paymentTransactionId: null })),
    transactions: [],
    ...overrides,
  };
  return debt;
}

function linkTransaction(
  debt: DebtWithRelations,
  overrides: Partial<Linked> = {},
) {
  const transaction: Linked = {
    id: nextId('transaction'),
    name: 'Parcela 19/48: Carro',
    value: 1200,
    date: noon('2026-10-13'),
    type: 'EXPENSE',
    bankAccountId: 'itau',
    bankAccount: { id: 'itau', name: 'Itaú', color: '#FF7A00' },
    ...overrides,
  };
  debt.transactions.push(transaction);
  return transaction;
}

function payInstallment(
  debt: DebtWithRelations,
  number: number,
  overrides: Partial<Linked> = {},
) {
  const transaction = linkTransaction(debt, overrides);
  debt.installments.find((row) => row.number === number).paymentTransactionId =
    transaction.id;
  return transaction;
}

const carroBody = {
  name: 'Carro',
  installmentValue: 1200,
  installmentsCount: 48,
  dueDay: 10,
  nextInstallment: 19,
  nextInstallmentMonth: '2026-11',
};

const bankAccounts = [
  { id: 'itau', userId: ANA, name: 'Itaú' },
  { id: 'bia-account', userId: BIA, name: 'Bia' },
];

describe('DebtsService', () => {
  let service: DebtsService;
  let debts: DebtWithRelations[];
  let debtsRepository: Record<string, jest.Mock>;
  let categories: { userId: string; id: string; icon: string; type: string }[];
  let deleteError: Error | null;

  const ownerOf = (debtId: string) => debts.find((debt) => debt.id === debtId);
  const rowOf = (debt: DebtWithRelations, number: number) =>
    debt.installments.find((row) => row.number === number);

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
    debts = [];
    deleteError = null;
    categories = [
      { userId: ANA, id: 'ana-debt-income', icon: 'debt', type: 'INCOME' },
      { userId: BIA, id: 'bia-debt-income', icon: 'debt', type: 'INCOME' },
    ];
    // Stands in for the database: what the repository writes shows up when
    // the debt is read again.
    debtsRepository = {
      create: jest.fn(async (userId, data, rows, entry) => {
        const debt = makeDebt({
          userId,
          ...data,
          installments: rows.map((row: Row) => ({
            ...row,
            paymentTransactionId: null,
          })),
        });
        if (entry) {
          linkTransaction(debt, {
            name: entry.name,
            value: entry.value,
            date: entry.date,
            type: entry.type,
            bankAccountId: entry.bankAccountId,
            categoryId: entry.categoryId,
          } as Partial<Linked>);
        }
        debts.push(debt);
        return debt;
      }),
      findManyByUserId: jest.fn(async (userId) =>
        debts.filter((debt) => debt.userId === userId),
      ),
      findFirst: jest.fn(
        async (userId, debtId) =>
          debts.find((debt) => debt.userId === userId && debt.id === debtId) ??
          null,
      ),
      update: jest.fn(async (debtId, data, reconciliation) => {
        const debt = ownerOf(debtId);
        Object.assign(debt, data);
        if (reconciliation) {
          debt.installments = debt.installments
            .filter((row) => !reconciliation.removeNumbers.includes(row.number))
            .map((row) => ({
              ...row,
              ...reconciliation.update.find(
                (updated: Row) => updated.number === row.number,
              ),
            }));
          debt.installments.push(
            ...reconciliation.create.map((row: Row) => ({
              ...row,
              paymentTransactionId: null,
            })),
          );
          debt.installments.sort((a, b) => a.number - b.number);
        }
        return debt;
      }),
      updateExpectedValue: jest.fn(async (debtId, fromNumber, value) => {
        ownerOf(debtId)
          .installments.filter(
            (row) =>
              row.number >= fromNumber &&
              !row.paidBeforeApp &&
              row.paymentTransactionId === null,
          )
          .forEach((row) => (row.expectedValue = value));
      }),
      delete: jest.fn(async (debtId) => {
        if (deleteError) throw deleteError;
        debts = debts.filter((debt) => debt.id !== debtId);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtsService,
        ValidateDebtOwnershipService,
        ValidateBankAccountOwnershipService,
        { provide: DebtsRepository, useValue: debtsRepository },
        {
          provide: CategoriesRepository,
          useValue: {
            findByIcon: async (userId: string, icon: string, type: string) =>
              categories.find(
                (category) =>
                  category.userId === userId &&
                  category.icon === icon &&
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
      ],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
    setToday('2026-10-13T15:00:00.000Z');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('AE1: registers the Carro with 48 rows, 18 paid before the app, and no transaction', async () => {
      await service.create(ANA, carroBody);

      const [userId, data, rows, entry] = debtsRepository.create.mock.calls[0];
      expect(userId).toBe(ANA);
      expect(data).toEqual({ name: 'Carro', dueDay: 10 });
      expect(rows).toHaveLength(48);
      expect(
        rows
          .filter((row: Row) => row.paidBeforeApp)
          .map((row: Row) => row.number),
      ).toEqual(Array.from({ length: 18 }, (_, index) => index + 1));
      expect(rows[18]).toEqual({
        number: 19,
        dueMonth: monthDate('2026-11'),
        expectedValue: 1200,
        paidBeforeApp: false,
      });
      expect(rows[47].dueMonth).toEqual(monthDate('2029-04'));
      expect(entry).toBeNull();
      expect(debts[0].transactions).toEqual([]);

      const carro = await service.findOne(ANA, debts[0].id);
      expect(carro).toMatchObject({
        remaining: 36000,
        endsIn: '2029-04',
        paidCount: 18,
        installmentsCount: 48,
        status: 'IN_PROGRESS',
      });
    });

    it('AE10: with the entry checked, creates an income on the account with the debt category and the debt id', async () => {
      await service.create(ANA, {
        name: 'Empréstimo Itaú',
        installmentValue: 550,
        installmentsCount: 24,
        dueDay: 10,
        nextInstallment: 1,
        nextInstallmentMonth: '2026-11',
        entryBankAccountId: 'itau',
        entryValue: 10000,
      });

      const [debt] = debts;
      expect(debtsRepository.create.mock.calls[0][3]).toMatchObject({
        userId: ANA,
        bankAccountId: 'itau',
        categoryId: 'ana-debt-income',
        value: 10000,
        type: 'INCOME',
        date: noon('2026-10-13'),
      });
      expect(debt.transactions).toHaveLength(1);
      expect(debt.transactions[0]).toMatchObject({
        value: 10000,
        type: 'INCOME',
        bankAccountId: 'itau',
      });
      expect(debt.transactions[0].name).toContain('Empréstimo Itaú');

      const view = await service.findOne(ANA, debt.id);
      expect(view.remaining).toBe(13200);
      expect(view.hasPayment).toBe(false);
    });

    it('creates no entry without the checkbox', async () => {
      await service.create(ANA, { ...carroBody, nextInstallment: 1 });

      expect(debtsRepository.create.mock.calls[0][3]).toBeNull();
    });

    it("refuses an entry on another user's account", async () => {
      await expect(
        service.create(ANA, {
          ...carroBody,
          entryBankAccountId: 'bia-account',
          entryValue: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(debtsRepository.create).not.toHaveBeenCalled();
    });

    it('fails when the debt category does not exist', async () => {
      categories = [];

      await expect(
        service.create(ANA, {
          ...carroBody,
          entryBankAccountId: 'itau',
          entryValue: 100,
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(debtsRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 for a next installment greater than the total', async () => {
      await expect(
        service.create(ANA, { ...carroBody, nextInstallment: 49 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(debtsRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 for a next installment month outside the 120-month window', async () => {
      await expect(
        service.create(ANA, { ...carroBody, nextInstallmentMonth: '2036-11' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(ANA, { ...carroBody, nextInstallmentMonth: '2016-09' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(debtsRepository.create).not.toHaveBeenCalled();

      await service.create(ANA, {
        ...carroBody,
        nextInstallmentMonth: '2036-10',
      });
      expect(debtsRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('AE13: moving the next installment from 19 to 20 with no payment makes 1 to 19 paid before the app', async () => {
      const debt = makeDebt();
      debts.push(debt);

      await service.update(ANA, debt.id, {
        name: 'Carro',
        dueDay: 10,
        nextInstallment: 20,
        nextInstallmentMonth: '2026-11',
      });

      expect(debt.installments).toHaveLength(48);
      expect(debt.installments.filter((row) => row.paidBeforeApp)).toHaveLength(
        19,
      );
      expect(rowOf(debt, 19).paidBeforeApp).toBe(true);
      expect(rowOf(debt, 20)).toMatchObject({
        paidBeforeApp: false,
        dueMonth: monthDate('2026-11'),
      });
      expect(rowOf(debt, 48).dueMonth).toEqual(monthDate('2029-03'));
    });

    it('lowering the total deletes the rows past it, and raising it adds rows with the last value', async () => {
      const debt = makeDebt();
      debts.push(debt);
      rowOf(debt, 40).expectedValue = 900;

      await service.update(ANA, debt.id, {
        name: 'Carro',
        dueDay: 10,
        installmentsCount: 40,
      });
      expect(debt.installments.map((row) => row.number)).toEqual(
        Array.from({ length: 40 }, (_, index) => index + 1),
      );

      await service.update(ANA, debt.id, {
        name: 'Carro',
        dueDay: 10,
        installmentsCount: 50,
      });
      expect(debt.installments).toHaveLength(50);
      expect(rowOf(debt, 40).dueMonth).toEqual(monthDate('2028-08'));
      expect(rowOf(debt, 49)).toMatchObject({
        expectedValue: 900,
        dueMonth: monthDate('2029-05'),
      });
      expect(rowOf(debt, 50)).toMatchObject({
        expectedValue: 900,
        dueMonth: monthDate('2029-06'),
      });
    });

    it('changes the name and due day at any time, even with payments', async () => {
      const debt = makeDebt();
      payInstallment(debt, 19);
      debts.push(debt);

      await service.update(ANA, debt.id, {
        name: 'Carro novo',
        dueDay: 15,
        installmentsCount: 48,
        nextInstallment: 19,
        nextInstallmentMonth: '2026-11',
      });

      expect(debt).toMatchObject({ name: 'Carro novo', dueDay: 15 });
      expect(debtsRepository.update).toHaveBeenCalledWith(
        debt.id,
        { name: 'Carro novo', dueDay: 15 },
        null,
      );
    });

    it.each([
      ['the total', { installmentsCount: 47 }],
      ['the next installment', { nextInstallment: 20 }],
      [
        'the month of the next installment',
        { nextInstallmentMonth: '2026-12' },
      ],
    ])('AE13: changing %s with a payment returns 409', async (_, changes) => {
      const debt = makeDebt();
      payInstallment(debt, 19);
      debts.push(debt);

      await expect(
        service.update(ANA, debt.id, { name: 'Carro', dueDay: 10, ...changes }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(debt.installments).toHaveLength(48);
      expect(rowOf(debt, 19).paidBeforeApp).toBe(false);
    });

    it('AE13: the loan entry does not count as a payment', async () => {
      const debt = makeDebt();
      linkTransaction(debt, { type: 'INCOME', name: 'Empréstimo: Carro' });
      debts.push(debt);

      await service.update(ANA, debt.id, {
        name: 'Carro',
        dueDay: 10,
        installmentsCount: 40,
      });

      expect(debt.installments).toHaveLength(40);
    });

    it('returns 400 for a next installment greater than the new total', async () => {
      const debt = makeDebt();
      debts.push(debt);

      await expect(
        service.update(ANA, debt.id, {
          name: 'Carro',
          dueDay: 10,
          installmentsCount: 18,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(debt.installments).toHaveLength(48);
    });
  });

  describe('updateExpectedValue', () => {
    it('changes the value from an open installment to the last and keeps the paid ones', async () => {
      const debt = makeDebt();
      payInstallment(debt, 19);
      debts.push(debt);

      await service.updateExpectedValue(ANA, debt.id, {
        fromInstallment: 30,
        value: 1300,
      });

      expect(rowOf(debt, 29).expectedValue).toBe(1200);
      expect(rowOf(debt, 30).expectedValue).toBe(1300);
      expect(rowOf(debt, 48).expectedValue).toBe(1300);
      expect(rowOf(debt, 19).expectedValue).toBe(1200);
    });

    it('a start before a paid installment leaves that installment alone', async () => {
      const debt = makeDebt();
      payInstallment(debt, 21);
      debts.push(debt);

      await service.updateExpectedValue(ANA, debt.id, {
        fromInstallment: 20,
        value: 1300,
      });

      expect(rowOf(debt, 20).expectedValue).toBe(1300);
      expect(rowOf(debt, 21).expectedValue).toBe(1200);
      expect(rowOf(debt, 22).expectedValue).toBe(1300);
    });

    it.each([
      ['a paid installment', 19],
      ['an installment paid before the app', 5],
    ])('returns 409 from %s', async (_, fromInstallment) => {
      const debt = makeDebt();
      payInstallment(debt, 19);
      debts.push(debt);

      await expect(
        service.updateExpectedValue(ANA, debt.id, {
          fromInstallment,
          value: 1300,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(debtsRepository.updateExpectedValue).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('AE13: deletes a debt with no transaction, rows included', async () => {
      const debt = makeDebt();
      debts.push(debt);

      await expect(service.remove(ANA, debt.id)).resolves.toBeNull();

      expect(debts).toEqual([]);
    });

    it.each([
      ['a payment', { type: 'EXPENSE' as const }],
      ['the loan entry', { type: 'INCOME' as const }],
    ])('AE13: returns 409 for a debt with %s', async (_, linked) => {
      const debt = makeDebt();
      linkTransaction(debt, linked);
      debts.push(debt);

      await expect(service.remove(ANA, debt.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(debtsRepository.delete).not.toHaveBeenCalled();
    });

    it('turns a foreign key violation into 409', async () => {
      const debt = makeDebt();
      debts.push(debt);
      deleteError = new Prisma.PrismaClientKnownRequestError('Foreign key', {
        code: 'P2003',
        clientVersion: '4.16.1',
      });

      await expect(service.remove(ANA, debt.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('reads', () => {
    it('lists the debts still owing before the paid ones, without the rows', async () => {
      const paid = makeDebt({ name: 'Moto' });
      paid.installments.forEach((row) => (row.paidBeforeApp = true));
      debts.push(paid, makeDebt());

      const list = await service.findAllByUserId(ANA);

      expect(list.map((debt) => debt.name)).toEqual(['Carro', 'Moto']);
      expect(list[0]).toMatchObject({
        installmentsCount: 48,
        paidCount: 18,
        remaining: 36000,
        endsIn: '2029-04',
        status: 'IN_PROGRESS',
        nextInstallment: {
          number: 19,
          month: '2026-11',
          dueDate: noon('2026-11-10'),
          expectedValue: 1200,
        },
      });
      expect(list[0]).not.toHaveProperty('installments');
      expect(list[1]).toMatchObject({
        paidCount: 48,
        remaining: 0,
        endsIn: null,
        status: 'PAID',
        nextInstallment: null,
      });
    });

    it('returns the detail with the payment of a paid installment and the shortcuts', async () => {
      const debt = makeDebt();
      const payment = payInstallment(debt, 19, { value: 1150 });
      debts.push(debt);

      const detail = await service.findOne(ANA, debt.id);

      expect(detail.hasPayment).toBe(true);
      expect(detail.lastPaymentBankAccountId).toBe('itau');
      expect(detail.registration).toEqual({
        installmentsCount: 48,
        nextInstallment: 19,
        nextInstallmentMonth: '2026-11',
      });
      expect(detail.paidCount).toBe(19);
      expect(detail.installments).toHaveLength(48);
      expect(detail.installments[0]).toMatchObject({
        number: 1,
        state: 'PAID_BEFORE_APP',
        payment: null,
      });
      expect(detail.installments[18]).toMatchObject({
        number: 19,
        month: '2026-11',
        dueDate: noon('2026-11-10'),
        expectedValue: 1200,
        state: 'PAID',
        payment: {
          transactionId: payment.id,
          value: 1150,
          date: payment.date,
          bankAccount: { id: 'itau', name: 'Itaú', color: '#FF7A00' },
        },
      });
      expect(detail.installments[19]).toMatchObject({
        number: 20,
        state: 'OPEN',
        payment: null,
      });
      expect(detail.shortcuts).toEqual({
        currentMonth: [],
        overdueAndCurrentMonth: [],
      });
      expect(detail.reminderNumbers).toEqual([]);
    });
  });

  describe('user scoping', () => {
    it("returns 404 for another user's debt on every route", async () => {
      const debt = makeDebt({ userId: BIA });
      debts.push(debt);

      await expect(service.findOne(ANA, debt.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.update(ANA, debt.id, { name: 'Carro', dueDay: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.updateExpectedValue(ANA, debt.id, {
          fromInstallment: 20,
          value: 1300,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove(ANA, debt.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(debtsRepository.update).not.toHaveBeenCalled();
      expect(debtsRepository.updateExpectedValue).not.toHaveBeenCalled();
      expect(debtsRepository.delete).not.toHaveBeenCalled();
      expect(await service.findAllByUserId(ANA)).toEqual([]);
    });
  });
});

describe('debt request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: object, metatype: new () => object) =>
    pipe.transform(body, { type: 'body', metatype });

  it.each([
    ['481 installments', { ...carroBody, installmentsCount: 481 }],
    ['0 installments', { ...carroBody, installmentsCount: 0 }],
    ['a next installment of 0', { ...carroBody, nextInstallment: 0 }],
    ['due day 32', { ...carroBody, dueDay: 32 }],
    ['due day 0', { ...carroBody, dueDay: 0 }],
    ['a zero installment value', { ...carroBody, installmentValue: 0 }],
    [
      'an installment value with three decimals',
      { ...carroBody, installmentValue: 10.555 },
    ],
    ['a month of 13', { ...carroBody, nextInstallmentMonth: '2026-13' }],
    [
      'an entry account without a value',
      { ...carroBody, entryBankAccountId: 'itau' },
    ],
    ['an entry value without an account', { ...carroBody, entryValue: 100 }],
  ])('rejects %s with 400', async (_, body) => {
    await expect(validate(body, CreateDebtDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts 480 installments, due day 31 and a two-decimal value', async () => {
    const body = {
      ...carroBody,
      installmentsCount: 480,
      dueDay: 31,
      installmentValue: 10.55,
    };

    await expect(validate(body, CreateDebtDto)).resolves.toEqual(body);
  });

  it('accepts an entry with account and value', async () => {
    const body = {
      ...carroBody,
      entryBankAccountId: '33333333-3333-3333-3333-333333333333',
      entryValue: 10000,
    };

    await expect(validate(body, CreateDebtDto)).resolves.toEqual(body);
  });

  it.each([
    ['481 installments', { name: 'Carro', dueDay: 10, installmentsCount: 481 }],
    ['due day 32', { name: 'Carro', dueDay: 32 }],
  ])('rejects an edit with %s with 400', async (_, body) => {
    await expect(validate(body, UpdateDebtDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an expected value that is zero or has three decimals', async () => {
    await expect(
      validate({ fromInstallment: 20, value: 0 }, UpdateExpectedValueDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validate({ fromInstallment: 20, value: 1.005 }, UpdateExpectedValueDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
