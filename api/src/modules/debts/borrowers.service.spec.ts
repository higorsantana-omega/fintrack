import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BorrowersService } from './borrowers.service';
import { ValidateBorrowerOwnershipService } from './validate-borrower-ownership.service';
import {
  BorrowerWithRelations,
  BorrowersRepository,
} from 'src/database/repositories/borrowers.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { CreateBorrowerDto } from './dto/create-borrower.dto';
import {
  BorrowerMovementKind,
  CreateBorrowerMovementDto,
} from './dto/create-borrower-movement.dto';

const ANA = '11111111-1111-1111-1111-111111111111';
const BIA = '22222222-2222-2222-2222-222222222222';

const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);

type Movement = BorrowerWithRelations['transactions'][number];

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

function makeBorrower(overrides: Partial<BorrowerWithRelations> = {}) {
  const borrower: BorrowerWithRelations = {
    id: nextId('borrower'),
    userId: ANA,
    name: 'João',
    openingBalance: 1500,
    createdAt: new Date('2026-01-10T15:00:00.000Z'),
    transactions: [],
    ...overrides,
  };
  return borrower;
}

function makeMovement(
  type: 'INCOME' | 'EXPENSE',
  value: number,
  overrides: Partial<Movement> = {},
): Movement {
  return {
    id: nextId('transaction'),
    name: type === 'EXPENSE' ? 'Empréstimo: João' : 'Devolução: João',
    value,
    date: noon('2026-10-01'),
    type,
    bankAccountId: 'inter',
    bankAccount: { id: 'inter', name: 'Inter', color: '#FF7A00' },
    ...overrides,
  };
}

const bankAccounts = [
  { id: 'itau', userId: ANA, name: 'Itaú', color: '#EC7000' },
  { id: 'inter', userId: ANA, name: 'Inter', color: '#FF7A00' },
  { id: 'bia-account', userId: BIA, name: 'Bia', color: '#000000' },
];

describe('BorrowersService', () => {
  let service: BorrowersService;
  let borrowers: BorrowerWithRelations[];
  let borrowersRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let categories: { userId: string; id: string; key: string; type: string }[];
  let deleteError: Error | null;

  const ownerOf = (borrowerId: string) =>
    borrowers.find((borrower) => borrower.id === borrowerId);

  beforeEach(async () => {
    borrowers = [];
    deleteError = null;
    categories = [
      { userId: ANA, id: 'ana-loan-expense', key: 'loans', type: 'EXPENSE' },
      { userId: ANA, id: 'ana-loan-income', key: 'loans', type: 'INCOME' },
    ];
    // Stands in for the database: a transaction written with a borrowerId
    // shows up in that borrower's statement when it is read again.
    borrowersRepository = {
      create: jest.fn(async (userId, data) => {
        const borrower = makeBorrower({ userId, ...data });
        borrowers.push(borrower);
        return borrower;
      }),
      findManyByUserId: jest.fn(async (userId) =>
        borrowers.filter((borrower) => borrower.userId === userId),
      ),
      findFirst: jest.fn(
        async (userId, borrowerId) =>
          borrowers.find(
            (borrower) =>
              borrower.userId === userId && borrower.id === borrowerId,
          ) ?? null,
      ),
      update: jest.fn(async (borrowerId, data) =>
        Object.assign(ownerOf(borrowerId), data),
      ),
      delete: jest.fn(async (borrowerId) => {
        if (deleteError) throw deleteError;
        borrowers = borrowers.filter((borrower) => borrower.id !== borrowerId);
      }),
    };
    transactionsRepository = {
      create: jest.fn(async (data) => {
        const account = bankAccounts.find(
          ({ id }) => id === data.bankAccountId,
        );
        const movement = makeMovement(data.type, data.value, {
          name: data.name,
          date: data.date,
          bankAccountId: data.bankAccountId,
          bankAccount: {
            id: account.id,
            name: account.name,
            color: account.color,
          },
        });
        ownerOf(data.borrowerId).transactions.unshift(movement);
        return { ...data, id: movement.id };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowersService,
        ValidateBorrowerOwnershipService,
        ValidateBankAccountOwnershipService,
        { provide: BorrowersRepository, useValue: borrowersRepository },
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
      ],
    }).compile();

    service = module.get<BorrowersService>(BorrowersService);
    jest.useFakeTimers({
      now: new Date('2026-10-13T15:00:00.000Z'),
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const lend = (value: number, overrides = {}) => ({
    kind: BorrowerMovementKind.LEND,
    bankAccountId: 'inter',
    value,
    date: '2026-10-13T15:00:00.000Z',
    ...overrides,
  });
  const giveBack = (value: number, overrides = {}) => ({
    kind: BorrowerMovementKind.RETURN,
    bankAccountId: 'itau',
    value,
    date: '2026-10-13T15:00:00.000Z',
    ...overrides,
  });

  describe('create and update', () => {
    it('creates João with the opening balance and defaults it to 0', async () => {
      await service.create(ANA, { name: 'João', openingBalance: 1500 });
      await service.create(ANA, { name: 'Maria' });

      expect(borrowersRepository.create.mock.calls).toEqual([
        [ANA, { name: 'João', openingBalance: 1500 }],
        [ANA, { name: 'Maria', openingBalance: 0 }],
      ]);
    });

    it('accepts two people with the same name', async () => {
      await service.create(ANA, { name: 'João' });
      await service.create(ANA, { name: 'João' });

      const list = await service.findAllByUserId(ANA);

      expect(list.map(({ name }) => name)).toEqual(['João', 'João']);
      expect(list[0].id).not.toBe(list[1].id);
    });

    it('edits the name and the opening balance, and keeps the balance when omitted', async () => {
      const joao = makeBorrower();
      borrowers.push(joao);

      await service.update(ANA, joao.id, {
        name: 'João Silva',
        openingBalance: 1000,
      });
      expect((await service.findOne(ANA, joao.id)).balance).toBe(1000);

      await service.update(ANA, joao.id, { name: 'João' });
      expect(borrowersRepository.update).toHaveBeenLastCalledWith(joao.id, {
        name: 'João',
      });
      expect((await service.findOne(ANA, joao.id)).balance).toBe(1000);
    });
  });

  describe('movements', () => {
    it('AE8: lends R$ 500 from the Inter and takes R$ 300 back on the Itaú', async () => {
      const joao = makeBorrower();
      borrowers.push(joao);

      await service.createMovement(ANA, joao.id, lend(500));
      expect((await service.findOne(ANA, joao.id)).balance).toBe(2000);
      await service.createMovement(ANA, joao.id, giveBack(300));

      const [loan, repayment] = transactionsRepository.create.mock.calls.map(
        ([data]) => data,
      );
      expect(loan).toEqual({
        userId: ANA,
        bankAccountId: 'inter',
        categoryId: 'ana-loan-expense',
        borrowerId: joao.id,
        name: 'Empréstimo: João',
        value: 500,
        date: noon('2026-10-13'),
        type: 'EXPENSE',
      });
      expect(repayment).toEqual({
        userId: ANA,
        bankAccountId: 'itau',
        categoryId: 'ana-loan-income',
        borrowerId: joao.id,
        name: 'Devolução: João',
        value: 300,
        date: noon('2026-10-13'),
        type: 'INCOME',
      });
      expect(await service.findOne(ANA, joao.id)).toMatchObject({
        openingBalance: 1500,
        balance: 1700,
        maxReturn: 1700,
        overpaid: 0,
      });
    });

    it('AE8: refuses a return of R$ 2.000 with 409 and the maximum of R$ 1.700, writing nothing', async () => {
      const joao = makeBorrower({
        transactions: [
          makeMovement('EXPENSE', 500),
          makeMovement('INCOME', 300),
        ],
      });
      borrowers.push(joao);

      const error = await service
        .createMovement(ANA, joao.id, giveBack(2000))
        .catch((caught) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({
        statusCode: 409,
        maxReturn: 1700,
      });
      expect(transactionsRepository.create).not.toHaveBeenCalled();
      expect((await service.findOne(ANA, joao.id)).balance).toBe(1700);
    });

    it('accepts a return of exactly the balance built from 0,10 + 0,20 cents', async () => {
      const joao = makeBorrower({
        openingBalance: 0,
        transactions: [
          makeMovement('EXPENSE', 0.1),
          makeMovement('EXPENSE', 0.2),
        ],
      });
      borrowers.push(joao);

      await service.createMovement(ANA, joao.id, giveBack(0.3));

      expect(transactionsRepository.create).toHaveBeenCalledTimes(1);
      expect((await service.findOne(ANA, joao.id)).balance).toBe(0);
    });

    it('checks a back-dated return against the current balance', async () => {
      const joao = makeBorrower({ openingBalance: 100 });
      borrowers.push(joao);

      await expect(
        service.createMovement(
          ANA,
          joao.id,
          giveBack(150, { date: '2026-01-05T15:00:00.000Z' }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      await service.createMovement(
        ANA,
        joao.id,
        giveBack(100, { date: '2026-01-05T15:00:00.000Z' }),
      );

      expect(transactionsRepository.create.mock.calls[0][0].date).toEqual(
        noon('2026-01-05'),
      );
    });

    it('AE9: shows -R$ 500 and "overpaid" once the R$ 500 expense is gone, and lends again to R$ 300', async () => {
      const joao = makeBorrower({
        openingBalance: 0,
        transactions: [makeMovement('INCOME', 500)],
      });
      borrowers.push(joao);

      expect(await service.findOne(ANA, joao.id)).toMatchObject({
        balance: -500,
        maxReturn: 0,
        overpaid: 500,
      });
      expect(await service.findAllByUserId(ANA)).toEqual([
        {
          id: joao.id,
          name: 'João',
          balance: -500,
          maxReturn: 0,
          overpaid: 500,
        },
      ]);

      await service.createMovement(ANA, joao.id, lend(800));

      expect((await service.findAllByUserId(ANA))[0]).toMatchObject({
        balance: 300,
        overpaid: 0,
      });
    });

    it('lists the movements newest first with the account', async () => {
      const joao = makeBorrower();
      borrowers.push(joao);
      await service.createMovement(
        ANA,
        joao.id,
        lend(500, { date: '2026-10-10T15:00:00.000Z' }),
      );
      await service.createMovement(
        ANA,
        joao.id,
        giveBack(300, { date: '2026-10-12T15:00:00.000Z' }),
      );

      const { movements } = await service.findOne(ANA, joao.id);

      expect(movements).toEqual([
        expect.objectContaining({
          name: 'Devolução: João',
          value: 300,
          date: noon('2026-10-12'),
          type: 'INCOME',
          bankAccount: { id: 'itau', name: 'Itaú', color: '#EC7000' },
        }),
        expect.objectContaining({
          name: 'Empréstimo: João',
          value: 500,
          date: noon('2026-10-10'),
          type: 'EXPENSE',
        }),
      ]);
    });

    it('rejects a date more than 120 months away with 400', async () => {
      const joao = makeBorrower();
      borrowers.push(joao);

      await expect(
        service.createMovement(
          ANA,
          joao.id,
          lend(10, { date: '2036-11-01T15:00:00.000Z' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await service.createMovement(
        ANA,
        joao.id,
        lend(10, { date: '2036-10-01T15:00:00.000Z' }),
      );
    });

    it('answers 500 with nothing written when the loan category is missing', async () => {
      const joao = makeBorrower();
      borrowers.push(joao);
      categories = [];

      await expect(
        service.createMovement(ANA, joao.id, lend(10)),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('answers 409 for a person with movements, and also when only the database refuses', async () => {
      const joao = makeBorrower({
        transactions: [makeMovement('EXPENSE', 500)],
      });
      const maria = makeBorrower({ name: 'Maria' });
      borrowers.push(joao, maria);
      deleteError = new Prisma.PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: '4.16.1',
      });

      await expect(service.remove(ANA, joao.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(borrowersRepository.delete).not.toHaveBeenCalled();

      await expect(service.remove(ANA, maria.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(borrowers).toHaveLength(2);
    });

    it('deletes a person without movements', async () => {
      const maria = makeBorrower({ name: 'Maria' });
      borrowers.push(maria);

      await service.remove(ANA, maria.id);

      expect(borrowers).toEqual([]);
    });
  });

  describe('user scoping', () => {
    it("returns 404 for another user's person and account, writing nothing", async () => {
      const joao = makeBorrower({ userId: BIA });
      const own = makeBorrower();
      borrowers.push(joao, own);

      await expect(service.findOne(ANA, joao.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.update(ANA, joao.id, { name: 'João' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove(ANA, joao.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.createMovement(ANA, joao.id, lend(10)),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.createMovement(
          ANA,
          own.id,
          lend(10, { bankAccountId: 'bia-account' }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(borrowersRepository.update).not.toHaveBeenCalled();
      expect(borrowersRepository.delete).not.toHaveBeenCalled();
      expect(transactionsRepository.create).not.toHaveBeenCalled();
      expect((await service.findAllByUserId(ANA)).map(({ id }) => id)).toEqual([
        own.id,
      ]);
    });
  });
});

describe('borrower request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: object, metatype: new () => object) =>
    pipe.transform(body, { type: 'body', metatype });
  const account = '33333333-3333-3333-3333-333333333333';

  it.each([
    ['a negative opening balance', { name: 'João', openingBalance: -1 }],
    [
      'an opening balance with three decimals',
      { name: 'João', openingBalance: 1.005 },
    ],
    ['an empty name', { name: '' }],
  ])('rejects %s with 400', async (_, body) => {
    await expect(validate(body, CreateBorrowerDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts an opening balance of 0 and a missing one', async () => {
    await expect(
      validate({ name: 'João', openingBalance: 0 }, CreateBorrowerDto),
    ).resolves.toEqual({ name: 'João', openingBalance: 0 });
    await expect(
      validate({ name: 'João' }, CreateBorrowerDto),
    ).resolves.toEqual({ name: 'João' });
  });

  it.each([
    [
      'an unknown kind',
      {
        kind: 'GAVE',
        bankAccountId: account,
        value: 10,
        date: '2026-10-13T15:00:00.000Z',
      },
    ],
    [
      'a zero value',
      {
        kind: 'LEND',
        bankAccountId: account,
        value: 0,
        date: '2026-10-13T15:00:00.000Z',
      },
    ],
    [
      'a value with three decimals',
      {
        kind: 'RETURN',
        bankAccountId: account,
        value: 1.005,
        date: '2026-10-13T15:00:00.000Z',
      },
    ],
    ['no date', { kind: 'LEND', bankAccountId: account, value: 10 }],
  ])('rejects a movement with %s with 400', async (_, body) => {
    await expect(
      validate(body, CreateBorrowerMovementDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
