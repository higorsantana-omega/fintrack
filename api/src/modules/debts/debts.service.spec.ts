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
import { BorrowersRepository } from 'src/database/repositories/borrowers.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { getNewInstallmentRows } from './debt-calculations';
import { CreateDebtDto } from './dto/create-debt.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
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
  let borrowers: {
    userId: string;
    openingBalance: number;
    transactions: { type: string; value: number; bankAccountId: string }[];
  }[];

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
    borrowers = [];
    deleteError = null;
    categories = [
      { userId: ANA, id: 'ana-debt-income', icon: 'debt', type: 'INCOME' },
      { userId: ANA, id: 'ana-debt-expense', icon: 'debt', type: 'EXPENSE' },
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
      findOpenByUserId: jest.fn(async (userId) =>
        debts.filter(
          (debt) =>
            debt.userId === userId &&
            debt.installments.some(
              (row) => !row.paidBeforeApp && row.paymentTransactionId === null,
            ),
        ),
      ),
      pay: jest.fn(async (debtId, numbers, payment) => {
        const debt = ownerOf(debtId);
        const rows = debt.installments.filter(
          (row) =>
            numbers.includes(row.number) &&
            !row.paidBeforeApp &&
            row.paymentTransactionId === null,
        );
        if (rows.length !== numbers.length) return null;

        const transaction = linkTransaction(debt, payment);
        rows.forEach((row) => (row.paymentTransactionId = transaction.id));
        return { ...payment, id: transaction.id, debtId };
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
          provide: BorrowersRepository,
          useValue: {
            findManyByUserId: async (userId: string) =>
              borrowers.filter((borrower) => borrower.userId === userId),
          },
        },
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

  describe('pay', () => {
    const payBody = {
      installmentNumbers: [19, 20],
      bankAccountId: 'itau',
      value: 2450,
      date: '2026-12-15T15:00:00.000Z',
    };

    function makeOverdueCarro() {
      const debt = makeDebt();
      debts.push(debt);
      return debt;
    }

    it('AE2: paying 19 and 20 for R$ 2.450 creates one expense with the debt id and both rows point at it', async () => {
      setToday('2026-12-15T15:00:00.000Z');
      const debt = makeOverdueCarro();

      const transaction = await service.pay(ANA, debt.id, payBody);

      expect(debtsRepository.pay).toHaveBeenCalledTimes(1);
      expect(debtsRepository.pay).toHaveBeenCalledWith(debt.id, [19, 20], {
        userId: ANA,
        bankAccountId: 'itau',
        categoryId: 'ana-debt-expense',
        name: 'Parcelas 19–20/48: Carro',
        value: 2450,
        date: noon('2026-12-15'),
        type: 'EXPENSE',
      });
      expect(transaction).toMatchObject({ debtId: debt.id, value: 2450 });
      expect(debt.transactions).toHaveLength(1);
      expect(rowOf(debt, 19).paymentTransactionId).toBe(transaction.id);
      expect(rowOf(debt, 20).paymentTransactionId).toBe(transaction.id);
      expect(rowOf(debt, 21).paymentTransactionId).toBeNull();

      const carro = await service.findOne(ANA, debt.id);
      expect(carro).toMatchObject({
        remaining: 33600,
        status: 'IN_PROGRESS',
        paidCount: 20,
      });
    });

    it('stores the chosen calendar day at noon UTC', async () => {
      const debt = makeOverdueCarro();

      await service.pay(ANA, debt.id, {
        ...payBody,
        installmentNumbers: [19],
        date: '2026-10-13T02:30:00.000Z',
      });

      expect(debtsRepository.pay.mock.calls[0][2]).toMatchObject({
        name: 'Parcela 19/48: Carro',
        date: noon('2026-10-12'),
      });
    });

    it('AE4: paying every open installment names it a payoff and leaves the debt paid', async () => {
      const debt = makeOverdueCarro();
      const open = debt.installments
        .filter((row) => !row.paidBeforeApp)
        .map((row) => row.number);

      await service.pay(ANA, debt.id, {
        ...payBody,
        installmentNumbers: open,
        value: 24000,
      });

      expect(debtsRepository.pay.mock.calls[0][2]).toMatchObject({
        name: 'Quitação: Carro',
        value: 24000,
      });
      expect(await service.findOne(ANA, debt.id)).toMatchObject({
        status: 'PAID',
        remaining: 0,
      });
    });

    it('returns 409 and writes nothing when one of the installments is already paid', async () => {
      const debt = makeOverdueCarro();
      payInstallment(debt, 19);

      await expect(service.pay(ANA, debt.id, payBody)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(debt.transactions).toHaveLength(1);
      expect(rowOf(debt, 20).paymentTransactionId).toBeNull();
    });

    it('returns 409 for an installment paid before the app', async () => {
      const debt = makeOverdueCarro();

      await expect(
        service.pay(ANA, debt.id, { ...payBody, installmentNumbers: [5] }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(debt.transactions).toEqual([]);
    });

    it('returns 400 for a number greater than the installments count', async () => {
      const debt = makeOverdueCarro();

      await expect(
        service.pay(ANA, debt.id, { ...payBody, installmentNumbers: [48, 49] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(debtsRepository.pay).not.toHaveBeenCalled();
    });

    it('returns 400 for a date outside the 120-month window', async () => {
      const debt = makeOverdueCarro();

      await expect(
        service.pay(ANA, debt.id, {
          ...payBody,
          date: '2037-01-15T15:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.pay(ANA, debt.id, {
          ...payBody,
          date: '2016-07-15T15:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(debtsRepository.pay).not.toHaveBeenCalled();
    });

    it("returns 404 for another user's bank account and writes nothing", async () => {
      const debt = makeOverdueCarro();

      await expect(
        service.pay(ANA, debt.id, { ...payBody, bankAccountId: 'bia-account' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(debtsRepository.pay).not.toHaveBeenCalled();
      expect(debt.transactions).toEqual([]);
    });

    it("returns 404 for another user's debt", async () => {
      const debt = makeDebt({ userId: BIA });
      debts.push(debt);

      await expect(service.pay(ANA, debt.id, payBody)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(debtsRepository.pay).not.toHaveBeenCalled();
    });

    it('fails with an error and writes nothing when the debt category does not exist', async () => {
      const debt = makeOverdueCarro();
      categories = categories.filter(({ type }) => type !== 'EXPENSE');

      await expect(service.pay(ANA, debt.id, payBody)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(debtsRepository.pay).not.toHaveBeenCalled();
      expect(debt.transactions).toEqual([]);
    });
  });

  describe('findReminders', () => {
    function makeLoan(overrides: Partial<DebtWithRelations>) {
      return makeDebt({
        installments: getNewInstallmentRows({
          installmentsCount: 12,
          nextInstallment: 1,
          nextDueMonth: 2027 * 12,
          expectedValue: 500,
        }).map((row) => ({ ...row, paymentTransactionId: null })),
        ...overrides,
      });
    }

    it('AE6: lists the Carro with installment 19 due on 10/11 when the app opens on 6/11', async () => {
      setToday('2026-11-06T15:00:00.000Z');
      const carro = makeDebt();
      debts.push(carro);

      const reminders = await service.findReminders(ANA);

      expect(reminders).toEqual([
        {
          debtId: carro.id,
          debtName: 'Carro',
          dueDate: noon('2026-11-10'),
          expectedValue: 1200,
          installments: [
            {
              number: 19,
              month: '2026-11',
              dueDate: noon('2026-11-10'),
              expectedValue: 1200,
            },
          ],
          lastPaymentBankAccountId: null,
        },
      ]);
    });

    it('AE14: lists the Moto on 29/12 with the January installment due on the 2nd', async () => {
      setToday('2026-12-29T15:00:00.000Z');
      const moto = makeLoan({ name: 'Moto', dueDay: 2 });
      debts.push(moto);

      const reminders = await service.findReminders(ANA);

      expect(reminders).toHaveLength(1);
      expect(reminders[0]).toMatchObject({
        debtName: 'Moto',
        dueDate: noon('2027-01-02'),
        installments: [
          {
            number: 1,
            month: '2027-01',
            dueDate: noon('2027-01-02'),
            expectedValue: 500,
          },
        ],
      });
    });

    it('orders by the nearest due date, then by name, then by id, and leaves out debts with nothing due soon', async () => {
      setToday('2026-11-06T15:00:00.000Z');
      const carro = makeDebt();
      const moto = makeLoan({
        id: 'debt-b',
        name: 'Moto',
        dueDay: 8,
        installments: getNewInstallmentRows({
          installmentsCount: 12,
          nextInstallment: 1,
          nextDueMonth: 2026 * 12 + 10,
          expectedValue: 500,
        }).map((row) => ({ ...row, paymentTransactionId: null })),
      });
      const celular = makeDebt({ id: 'debt-a', name: 'Celular', dueDay: 10 });
      const far = makeLoan({ name: 'Reforma', dueDay: 28 });
      debts.push(carro, far, celular, moto);

      const reminders = await service.findReminders(ANA);

      expect(reminders.map((reminder) => reminder.debtName)).toEqual([
        'Moto',
        'Carro',
        'Celular',
      ]);
    });

    it('AE4: leaves out a paid debt', async () => {
      setToday('2026-11-06T15:00:00.000Z');
      const carro = makeDebt();
      carro.installments.forEach((row) => (row.paidBeforeApp = true));
      debts.push(carro);

      expect(await service.findReminders(ANA)).toEqual([]);
    });

    it('sums the expected values of the reminder installments in cents and carries the last payment account', async () => {
      setToday('2026-12-08T15:00:00.000Z');
      const carro = makeDebt();
      payInstallment(carro, 19);
      rowOf(carro, 20).expectedValue = 1200.1;
      rowOf(carro, 21).dueMonth = monthDate('2026-12');
      rowOf(carro, 21).expectedValue = 1200.2;
      debts.push(carro);

      const [reminder] = await service.findReminders(ANA);

      expect(reminder.installments.map(({ number }) => number)).toEqual([
        20, 21,
      ]);
      expect(reminder.expectedValue).toBe(2400.3);
      expect(reminder.lastPaymentBankAccountId).toBe('itau');
    });

    it("leaves out another user's debts", async () => {
      setToday('2026-11-06T15:00:00.000Z');
      debts.push(makeDebt({ userId: BIA }));

      expect(await service.findReminders(ANA)).toEqual([]);
    });
  });

  describe('getSummary', () => {
    it("sums the user's debts and the positive balances of the people, without the rows", async () => {
      debts.push(makeDebt(), makeDebt({ userId: BIA }));
      borrowers.push(
        {
          userId: ANA,
          openingBalance: 1500,
          transactions: [
            { type: 'EXPENSE', value: 500, bankAccountId: 'itau' },
            { type: 'INCOME', value: 300, bankAccountId: 'itau' },
          ],
        },
        {
          userId: ANA,
          openingBalance: 0,
          transactions: [{ type: 'INCOME', value: 100, bankAccountId: 'itau' }],
        },
        { userId: BIA, openingBalance: 900, transactions: [] },
      );

      const summary = await service.getSummary(ANA);

      expect(summary).toEqual({
        totalOwed: 36000,
        dueThisMonth: 0,
        endsIn: '2029-04',
        owedByPeople: 1700,
      });
    });

    it('returns zeros and no end month for a user without debts or people', async () => {
      await expect(service.getSummary(ANA)).resolves.toEqual({
        totalOwed: 0,
        dueThisMonth: 0,
        endsIn: null,
        owedByPeople: 0,
      });
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

  describe('payment', () => {
    const paymentBody = {
      installmentNumbers: [19, 20],
      bankAccountId: '33333333-3333-3333-3333-333333333333',
      value: 2450,
      date: '2026-12-15',
    };

    it('accepts a list of numbers, an account, a two-decimal value and a date', async () => {
      await expect(
        validate(paymentBody, CreateDebtPaymentDto),
      ).resolves.toEqual(paymentBody);
    });

    it.each([
      ['an empty list', { installmentNumbers: [] }],
      ['a repeated number', { installmentNumbers: [19, 19] }],
      ['a number of 0', { installmentNumbers: [0, 19] }],
      ['a fractional number', { installmentNumbers: [19.5] }],
      ['a zero value', { value: 0 }],
      ['a value with three decimals', { value: 10.555 }],
      ['an account that is not a uuid', { bankAccountId: 'itau' }],
      ['a date that is not a date', { date: 'ontem' }],
    ])('rejects %s with 400', async (_, override) => {
      await expect(
        validate({ ...paymentBody, ...override }, CreateDebtPaymentDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
