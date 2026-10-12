import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionType } from './entities/transaction.entity';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { ValidateCategoryOwnershipService } from '../categories/validate-category-ownership.service';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';

const ANA = 'ana';
const BIA = 'bia';

const transactions = [
  { id: 'ana-contribution', userId: ANA, goalId: 'goal' },
  { id: 'bia-transaction', userId: BIA, goalId: null },
];

const body = {
  bankAccountId: 'nubank',
  categoryId: 'ana-category',
  name: 'Aporte: Viagem',
  value: 300,
  date: '2027-03-05T12:00:00.000Z',
  type: TransactionType.EXPENSE,
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    transactionsRepository = {
      findFirst: jest.fn(
        async (userId: string, transactionId: string) =>
          transactions.find(
            (transaction) =>
              transaction.userId === userId && transaction.id === transactionId,
          ) ?? null,
      ),
      create: jest.fn(async (data) => data),
      update: jest.fn(async (_, data) => data),
      delete: jest.fn(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        ValidateBankAccountOwnershipService,
        ValidateCategoryOwnershipService,
        { provide: TransactionsRepository, useValue: transactionsRepository },
        {
          provide: BankAccountsRepository,
          useValue: {
            findFirst: async (userId: string, id: string) =>
              userId === ANA && id === 'nubank' ? { id } : null,
          },
        },
        {
          provide: CategoriesRepository,
          useValue: {
            findFirst: async (userId: string, id: string) =>
              userId === ANA && id === 'ana-category' ? { id } : null,
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it("returns 404 when editing another user's transaction", async () => {
    await expect(
      service.update(ANA, 'bia-transaction', body),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionsRepository.update).not.toHaveBeenCalled();
  });

  it("returns 404 when deleting another user's transaction", async () => {
    await expect(service.remove(ANA, 'bia-transaction')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transactionsRepository.delete).not.toHaveBeenCalled();
  });

  it('sends only the editable fields to the repository, so a contribution stays linked', async () => {
    await service.update(ANA, 'ana-contribution', {
      ...body,
      goalId: null,
      userId: BIA,
    } as typeof body);

    expect(transactionsRepository.update).toHaveBeenCalledWith(
      'ana-contribution',
      {
        bankAccountId: 'nubank',
        categoryId: 'ana-category',
        name: 'Aporte: Viagem',
        value: 300,
        date: '2027-03-05T12:00:00.000Z',
        type: 'EXPENSE',
      },
    );
  });

  it('creates a transaction with named fields only', async () => {
    await service.create(ANA, { ...body, goalId: 'goal' } as typeof body);

    expect(transactionsRepository.create).toHaveBeenCalledWith({
      userId: ANA,
      bankAccountId: 'nubank',
      categoryId: 'ana-category',
      name: 'Aporte: Viagem',
      value: 300,
      date: '2027-03-05T12:00:00.000Z',
      type: 'EXPENSE',
    });
  });

  it("deletes the caller's own transaction", async () => {
    await service.remove(ANA, 'ana-contribution');

    expect(transactionsRepository.delete).toHaveBeenCalledWith(
      'ana-contribution',
    );
  });
});
