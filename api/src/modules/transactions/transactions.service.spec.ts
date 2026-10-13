import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionType } from './entities/transaction.entity';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { ValidateCategoryOwnershipService } from '../categories/validate-category-ownership.service';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const ANA = 'ana';
const BIA = 'bia';

const transactions = [
  { id: 'ana-contribution', userId: ANA, goalId: 'goal' },
  {
    id: 'ana-invoice-payment',
    userId: ANA,
    goalId: null,
    creditCardId: 'nubank-card',
    cardInvoiceMonth: new Date('2026-10-01T00:00:00.000Z'),
  },
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

  it('AE16: editing the date and category of an invoice payment keeps its link to the invoice', async () => {
    await service.update(ANA, 'ana-invoice-payment', {
      ...body,
      name: 'Fatura Nubank outubro',
      date: '2026-11-02T12:00:00.000Z',
      creditCardId: null,
      cardInvoiceMonth: null,
    } as typeof body);

    const [, data] = transactionsRepository.update.mock.calls[0];
    expect(data).not.toHaveProperty('creditCardId');
    expect(data).not.toHaveProperty('cardInvoiceMonth');
    expect(data).toMatchObject({
      categoryId: 'ana-category',
      date: '2026-11-02T12:00:00.000Z',
    });
  });

  it('never writes the invoice link from a transaction body', async () => {
    await service.create(ANA, {
      ...body,
      creditCardId: 'nubank-card',
      cardInvoiceMonth: '2026-10-01',
    } as typeof body);

    const [data] = transactionsRepository.create.mock.calls[0];
    expect(data).not.toHaveProperty('creditCardId');
    expect(data).not.toHaveProperty('cardInvoiceMonth');

    const pipe = new ValidationPipe({ whitelist: true });
    for (const metatype of [CreateTransactionDto, UpdateTransactionDto]) {
      const validated = await pipe.transform(
        {
          ...body,
          categoryId: '33333333-3333-3333-3333-333333333333',
          bankAccountId: '44444444-4444-4444-4444-444444444444',
          creditCardId: 'nubank-card',
          cardInvoiceMonth: '2026-10-01',
        },
        { type: 'body', metatype },
      );
      expect(validated).not.toHaveProperty('creditCardId');
      expect(validated).not.toHaveProperty('cardInvoiceMonth');
    }
  });
});
