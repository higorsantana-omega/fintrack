import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BankAccountsService } from './bank-accounts.service';
import { ValidateBankAccountOwnershipService } from './validate-bank-account-ownership.service';
import { BankAccountType } from './entities/BankAccount';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { GoalsRepository } from 'src/database/repositories/goals.repositories';
import {
  CardWithRelations,
  CreditCardsRepository,
} from 'src/database/repositories/credit-cards.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import {
  DebtWithRelations,
  DebtsRepository,
} from 'src/database/repositories/debts.repositories';
import {
  BorrowerWithRelations,
  BorrowersRepository,
} from 'src/database/repositories/borrowers.repositories';

const ANA = 'ana';

const monthDate = (value: string) => new Date(`${value}-01T00:00:00.000Z`);

function nubank(overrides: Partial<CardWithRelations> = {}): CardWithRelations {
  const purchase = (month: string, value: number) => ({
    id: `purchase-${month}`,
    kind: 'PURCHASE' as const,
    description: 'Compras',
    totalValue: value,
    purchaseDate: new Date(`${month}-01T12:00:00.000Z`),
    installmentsCount: 1,
    currentInstallment: 1,
    anchorInvoiceMonth: null,
    recurringChargeId: null,
    category: null,
    installments: [{ number: 1, value, invoiceMonth: monthDate(month) }],
  });
  const payment = (month: string, value: number, bankAccountId: string) => ({
    id: `payment-${month}-${bankAccountId}`,
    name: `Fatura Nubank ${month}`,
    bankAccountId,
    value,
    date: new Date(`${month}-08T12:00:00.000Z`),
    type: 'EXPENSE' as const,
    cardInvoiceMonth: monthDate(month),
    bankAccount: { id: bankAccountId, name: bankAccountId, color: '#000' },
  });

  return {
    id: 'nubank-card',
    userId: ANA,
    name: 'Nubank',
    color: '#7950F2',
    limit: 10000,
    archivedAt: null,
    createdAt: new Date('2026-01-10T15:00:00.000Z'),
    cycles: [
      { closingDay: 3, dueDay: 10, effectiveFrom: monthDate('2026-01') },
    ],
    purchases: [
      purchase('2026-08', 500),
      purchase('2026-09', 300),
      purchase('2026-10', 200),
    ],
    payments: [
      payment('2026-08', 500, 'nubank'),
      payment('2026-09', 300, 'nubank'),
      payment('2026-10', 200, 'inter'),
    ],
    recurringCharges: [],
    ...overrides,
  };
}

// The Carro of the plan with installments 19 and 20 paid from Itaú.
function carro(): DebtWithRelations {
  const installment = (
    number: number,
    paymentTransactionId: string | null,
  ) => ({
    number,
    dueMonth: monthDate(`2026-${String(number - 9).padStart(2, '0')}`),
    expectedValue: 1200,
    paidBeforeApp: false,
    paymentTransactionId,
  });
  const payment = {
    id: 'carro-payment',
    name: 'Parcelas 19 e 20/48: Carro',
    value: 2400,
    date: new Date('2026-10-13T12:00:00.000Z'),
    type: 'EXPENSE' as const,
    bankAccountId: 'itau',
    bankAccount: { id: 'itau', name: 'Itaú', color: '#EC7000' },
  };

  return {
    id: 'carro',
    userId: ANA,
    name: 'Carro',
    dueDay: 10,
    createdAt: new Date('2026-01-10T15:00:00.000Z'),
    installments: [
      installment(19, 'carro-payment'),
      installment(20, 'carro-payment'),
      installment(21, null),
    ],
    transactions: [payment],
  };
}

// João owes 1.500 and returned 300 into Itaú.
function joao(): BorrowerWithRelations {
  return {
    id: 'joao',
    userId: ANA,
    name: 'João',
    openingBalance: 1500,
    createdAt: new Date('2026-01-10T15:00:00.000Z'),
    transactions: [
      {
        id: 'joao-return',
        name: 'Devolução: João',
        value: 300,
        date: new Date('2026-10-13T12:00:00.000Z'),
        type: 'INCOME',
        bankAccountId: 'itau',
        bankAccount: { id: 'itau', name: 'Itaú', color: '#EC7000' },
      },
    ],
  };
}

describe('BankAccountsService', () => {
  let service: BankAccountsService;
  let bankAccountsRepository: Record<string, jest.Mock>;
  let linkedGoals: { id: string; name: string }[];
  let findActiveGoalsLinkedToBankAccount: jest.Mock;
  let cards: CardWithRelations[];
  let findCards: jest.Mock;
  let debts: DebtWithRelations[];
  let borrowers: BorrowerWithRelations[];

  beforeEach(async () => {
    linkedGoals = [];
    bankAccountsRepository = {
      findFirst: jest.fn(async (userId: string, id: string) =>
        userId === ANA ? { id } : null,
      ),
      create: jest.fn(async (data) => data),
      update: jest.fn(async (_, data) => data),
      delete: jest.fn(async () => undefined),
    };
    findActiveGoalsLinkedToBankAccount = jest.fn(async () => linkedGoals);
    cards = [];
    findCards = jest.fn(async () => cards);
    debts = [];
    borrowers = [];
    jest.useFakeTimers({
      now: new Date('2026-10-20T15:00:00.000Z'),
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountsService,
        ValidateBankAccountOwnershipService,
        { provide: BankAccountsRepository, useValue: bankAccountsRepository },
        {
          provide: GoalsRepository,
          useValue: { findActiveGoalsLinkedToBankAccount },
        },
        {
          provide: CreditCardsRepository,
          useValue: { findManyByUserId: findCards },
        },
        {
          provide: CardPurchasesRepository,
          useValue: { materializeRecurringCharges: async () => undefined },
        },
        {
          provide: DebtsRepository,
          useValue: { findManyByUserId: jest.fn(async () => debts) },
        },
        {
          provide: BorrowersRepository,
          useValue: { findManyByUserId: jest.fn(async () => borrowers) },
        },
      ],
    }).compile();

    service = module.get<BankAccountsService>(BankAccountsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends only name, initial balance, type and color on update', async () => {
    await service.update(ANA, 'nubank', {
      id: 'nubank',
      userId: 'someone-else',
      user: { connect: { email: 'bia@example.com' } },
      name: 'Nubank',
      initialBalance: 100,
      type: BankAccountType.CHECKING,
      color: '#7950F2',
    } as any);

    expect(bankAccountsRepository.update).toHaveBeenCalledWith('nubank', {
      name: 'Nubank',
      initialBalance: 100,
      type: 'CHECKING',
      color: '#7950F2',
    });
  });

  it('creates an account with named fields only', async () => {
    await service.create(ANA, {
      id: 'forced-id',
      userId: 'someone-else',
      name: 'Nubank',
      initialBalance: 100,
      type: BankAccountType.CHECKING,
      color: '#7950F2',
    } as any);

    expect(bankAccountsRepository.create).toHaveBeenCalledWith({
      userId: ANA,
      name: 'Nubank',
      initialBalance: 100,
      type: 'CHECKING',
      color: '#7950F2',
    });
  });

  it('AE8/AE9: refuses to delete an account linked to a non-archived goal and names the goal', async () => {
    linkedGoals = [{ id: 'goal', name: 'Viagem' }];

    const error = await service.remove(ANA, 'nubank').catch((caught) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({ goals: ['Viagem'] });
    expect(findActiveGoalsLinkedToBankAccount).toHaveBeenCalledWith(
      ANA,
      'nubank',
    );
    expect(bankAccountsRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes an account without non-archived goals linked to it', async () => {
    await service.remove(ANA, 'nubank');

    expect(bankAccountsRepository.delete).toHaveBeenCalledWith('nubank');
  });

  describe('with card payments', () => {
    const removeError = (confirm?: boolean) =>
      service.remove(ANA, 'nubank', confirm).catch((caught) => caught);

    it('AE11: lists the invoices its payments would reopen and asks for confirmation; with confirm=true it deletes', async () => {
      cards = [nubank()];

      const error = await removeError();

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({
        invoices: [
          { cardName: 'Nubank', month: '2026-08', balance: 500 },
          { cardName: 'Nubank', month: '2026-09', balance: 300 },
        ],
        debts: [],
        borrowers: [],
      });
      expect(bankAccountsRepository.delete).not.toHaveBeenCalled();

      await service.remove(ANA, 'nubank', true);
      expect(bankAccountsRepository.delete).toHaveBeenCalledWith('nubank');
    });

    it('deletes right away when its payments reopen no invoice', async () => {
      cards = [
        nubank({
          payments: nubank().payments.map((payment) => ({
            ...payment,
            bankAccountId: 'inter',
          })),
        }),
      ];

      await service.remove(ANA, 'nubank');

      expect(bankAccountsRepository.delete).toHaveBeenCalledWith('nubank');
    });

    it('lists the invoices of archived cards too', async () => {
      cards = [nubank({ archivedAt: new Date('2026-10-15T12:00:00.000Z') })];

      const error = await removeError();

      expect(error.getResponse().invoices).toHaveLength(2);
    });

    it('keeps the goals lock first, before looking at invoices', async () => {
      cards = [nubank()];
      linkedGoals = [{ id: 'goal', name: 'Viagem' }];

      const error = await removeError(true);

      expect(error.getResponse()).toMatchObject({ goals: ['Viagem'] });
      expect(error.getResponse().invoices).toBeUndefined();
      expect(findCards).not.toHaveBeenCalled();
      expect(bankAccountsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('with debt payments and people movements', () => {
    const removeError = (bankAccountId: string, confirm?: boolean) =>
      service.remove(ANA, bankAccountId, confirm).catch((caught) => caught);

    it('AE11: lists the installments that reopen and the balance change of the person, with no invoices', async () => {
      debts = [carro()];
      borrowers = [joao()];

      const error = await removeError('itau');

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({
        invoices: [],
        debts: [{ debtId: 'carro', name: 'Carro', installments: [19, 20] }],
        borrowers: [{ borrowerId: 'joao', name: 'João', change: 300 }],
      });
      expect(bankAccountsRepository.delete).not.toHaveBeenCalled();
    });

    it('keeps the goals 409 first, even with debt payments', async () => {
      debts = [carro()];
      borrowers = [joao()];
      linkedGoals = [{ id: 'goal', name: 'Viagem' }];

      const error = await removeError('itau');

      expect(error.getResponse()).toMatchObject({ goals: ['Viagem'] });
      expect(error.getResponse().debts).toBeUndefined();
      expect(bankAccountsRepository.delete).not.toHaveBeenCalled();
    });

    it('answers with empty debts and borrowers when only invoices reopen', async () => {
      cards = [nubank()];
      debts = [carro()];
      borrowers = [joao()];

      const error = await removeError('nubank');

      expect(error.getResponse().invoices).toHaveLength(2);
      expect(error.getResponse()).toMatchObject({ debts: [], borrowers: [] });
    });

    it('deletes without a 409 when the account only holds the loan entry', async () => {
      const debt = carro();
      debt.transactions = [
        {
          ...debt.transactions[0],
          id: 'carro-entry',
          type: 'INCOME',
          bankAccountId: 'inter',
        },
      ];
      debts = [debt];

      await service.remove(ANA, 'inter');

      expect(bankAccountsRepository.delete).toHaveBeenCalledWith('inter');
    });

    it('deletes with confirm=true', async () => {
      debts = [carro()];
      borrowers = [joao()];

      await service.remove(ANA, 'itau', true);

      expect(bankAccountsRepository.delete).toHaveBeenCalledWith('itau');
    });
  });
});
