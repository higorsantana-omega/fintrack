import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { GoalsService } from './goals.service';
import { ValidateGoalOwnershipService } from './validate-goal-ownership.service';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import {
  GoalWithRelations,
  GoalsRepository,
} from 'src/database/repositories/goals.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ReminderAction, ResolveReminderDto } from './dto/resolve-reminder.dto';
import { formatMonthKey, getMonthKey } from 'src/shared/calendar';

const ANA = '11111111-1111-1111-1111-111111111111';
const BIA = '22222222-2222-2222-2222-222222222222';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);

const bankAccounts = [
  { id: 'nubank', userId: ANA, name: 'Nubank' },
  { id: 'inter', userId: ANA, name: 'Inter' },
  { id: 'bia-account', userId: BIA, name: 'Bia' },
];

const defaultCategories = [
  { id: 'ana-goal-expense', userId: ANA, icon: 'goal', type: 'EXPENSE' },
  { id: 'ana-goal-income', userId: ANA, icon: 'goal', type: 'INCOME' },
  { id: 'bia-goal-expense', userId: BIA, icon: 'goal', type: 'EXPENSE' },
  { id: 'bia-goal-income', userId: BIA, icon: 'goal', type: 'INCOME' },
];

let goalCounter = 0;

function makeGoal(
  overrides: Partial<GoalWithRelations> = {},
): GoalWithRelations {
  goalCounter += 1;
  return {
    id: `goal-${goalCounter}`,
    userId: ANA,
    bankAccountId: 'nubank',
    bankAccount: { id: 'nubank', name: 'Nubank', color: '#7950F2' },
    name: 'Viagem',
    targetAmount: 10000,
    monthlyContribution: 500,
    initialSaved: 0,
    contributionDay: 5,
    startDate: day('2027-01-01'),
    endDate: day('2027-12-31'),
    archivedAt: null,
    createdAt: new Date('2027-01-01T15:00:00.000Z'),
    transactions: [],
    skippedMonths: [],
    ...overrides,
  };
}

function contribution(
  goal: GoalWithRelations,
  date: string,
  value: number,
  bankAccountId = 'nubank',
) {
  return {
    id: `tx-${goal.id}-${date}-${bankAccountId}`,
    goalId: goal.id,
    bankAccountId,
    value,
    date: noon(date),
    type: 'EXPENSE' as const,
  };
}

const goalBody = {
  name: 'Viagem',
  targetAmount: 10000,
  monthlyContribution: 500,
  initialSaved: 1000,
  contributionDay: 5,
  startDate: '2027-01-01T03:00:00.000Z',
  endDate: '2027-12-31T03:00:00.000Z',
  bankAccountId: 'nubank',
};

function fakePrismaForArchive(goal: GoalWithRelations) {
  const state = {
    archivedAt: goal.archivedAt,
    operations: [] as string[],
    withdrawals: [] as any[],
  };
  const tx = {
    goal: {
      updateMany: async ({ where, data }) => {
        state.operations.push('updateMany');
        if (where.id !== goal.id || state.archivedAt) return { count: 0 };
        state.archivedAt = data.archivedAt;
        return { count: 1 };
      },
      findUnique: async () => {
        state.operations.push('findUnique');
        return { ...goal, archivedAt: state.archivedAt };
      },
    },
    transaction: {
      createMany: async ({ data }) => {
        state.operations.push('createMany');
        state.withdrawals.push(...data);
        return { count: data.length };
      },
    },
  };

  // The fake only exposes writes through `$transaction`, so a write made
  // outside the database transaction would fail.
  const prisma = { $transaction: async (callback) => callback(tx) };

  return { prisma, state };
}

describe('GoalsService', () => {
  let service: GoalsService;
  let goals: GoalWithRelations[];
  let categories: typeof defaultCategories;
  let goalsRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let prismaForArchive: any;

  async function buildService() {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        ValidateGoalOwnershipService,
        ValidateBankAccountOwnershipService,
        {
          provide: GoalsRepository,
          useValue: prismaForArchive
            ? Object.assign(new GoalsRepository(prismaForArchive), {
                findFirst: goalsRepository.findFirst,
              })
            : goalsRepository,
        },
        { provide: TransactionsRepository, useValue: transactionsRepository },
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

    service = module.get<GoalsService>(GoalsService);
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
    goals = [];
    categories = [...defaultCategories];
    prismaForArchive = null;
    goalsRepository = {
      findFirst: jest.fn(
        async (userId: string, goalId: string) =>
          goals.find((goal) => goal.userId === userId && goal.id === goalId) ??
          null,
      ),
      findManyByUserId: jest.fn(async (userId: string) =>
        goals.filter((goal) => goal.userId === userId),
      ),
      create: jest.fn(async (userId, data) => ({
        id: 'new-goal',
        userId,
        ...data,
      })),
      update: jest.fn(async (goalId, data) => ({ id: goalId, ...data })),
      delete: jest.fn(async () => undefined),
      createSkippedMonth: jest.fn(async (goalId, month) => ({ goalId, month })),
      archive: jest.fn(async () => true),
    };
    transactionsRepository = {
      create: jest.fn(async (data) => ({ id: 'new-transaction', ...data })),
      findManyByGoalId: jest.fn(async () => []),
    };

    await buildService();
    setToday('2027-05-10T15:00:00.000Z');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it("rejects another user's bank account with 404", async () => {
      await expect(
        service.create(ANA, { ...goalBody, bankAccountId: 'bia-account' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(goalsRepository.create).not.toHaveBeenCalled();
    });

    it('rejects an end date before the start date with 400', async () => {
      await expect(
        service.create(ANA, {
          ...goalBody,
          startDate: '2027-06-01T03:00:00.000Z',
          endDate: '2027-05-31T03:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(goalsRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a period longer than 50 years with 400', async () => {
      await expect(
        service.create(ANA, {
          ...goalBody,
          startDate: '0200-01-02T12:00:00.000Z',
          endDate: '9999-12-31T12:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(goalsRepository.create).not.toHaveBeenCalled();

      await service.create(ANA, {
        ...goalBody,
        startDate: '2027-01-01T12:00:00.000Z',
        endDate: '2076-12-31T12:00:00.000Z',
      });
      expect(goalsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('stores the start and end as São Paulo calendar days', async () => {
      await service.create(ANA, {
        ...goalBody,
        startDate: '2026-10-12T01:30:00.000Z',
        endDate: '2027-04-01T00:30:00.000Z',
      });

      const [, data] = goalsRepository.create.mock.calls[0];
      expect(data.startDate).toEqual(day('2026-10-11'));
      expect(data.endDate).toEqual(day('2027-03-31'));
    });
  });

  describe('contribute', () => {
    it('creates an expense on the source account, in the caller\'s "Metas" category, linked to the goal', async () => {
      const goal = makeGoal();
      goals.push(goal);

      await service.contribute(ANA, goal.id, {
        value: 250,
        date: '2027-04-01T00:30:00.000Z',
      });

      const [data] = transactionsRepository.create.mock.calls[0];
      expect(data).toEqual({
        userId: ANA,
        bankAccountId: 'nubank',
        categoryId: 'ana-goal-expense',
        goalId: goal.id,
        name: 'Aporte: Viagem',
        value: 250,
        date: noon('2027-03-31'),
        type: 'EXPENSE',
      });
      expect(formatMonthKey(getMonthKey(data.date))).toBe('2027-03');
    });

    it('fails and records nothing when only another user has the category', async () => {
      categories = categories.filter((category) => category.userId === BIA);
      const goal = makeGoal();
      goals.push(goal);

      await expect(
        service.contribute(ANA, goal.id, {
          value: 250,
          date: '2027-05-10T15:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it.each([
      ['scheduled', { startDate: day('2027-06-01') }],
      ['completed', { initialSaved: 10000 }],
      ['archived', { archivedAt: new Date('2027-04-01T12:00:00Z') }],
    ])('refuses a %s goal', async (_, overrides) => {
      const goal = makeGoal(overrides);
      goals.push(goal);

      await expect(
        service.contribute(ANA, goal.id, {
          value: 250,
          date: '2027-05-10T15:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveReminder', () => {
    function goalPendingSinceMarch() {
      const goal = makeGoal();
      goal.transactions = [
        contribution(goal, '2027-01-05', 500),
        contribution(goal, '2027-02-05', 500),
      ];
      goals.push(goal);
      return goal;
    }

    it('AE11: confirming March on May 10th records the expense on March 5th with the informed value', async () => {
      const goal = goalPendingSinceMarch();

      await service.resolveReminder(ANA, goal.id, '2027-03', {
        action: ReminderAction.CONFIRM,
        value: 650,
      });

      const [data] = transactionsRepository.create.mock.calls[0];
      expect(data).toMatchObject({
        categoryId: 'ana-goal-expense',
        goalId: goal.id,
        name: 'Aporte: Viagem',
        value: 650,
        date: noon('2027-03-05'),
        type: 'EXPENSE',
      });
    });

    it('records "não aportei" on the first day of the month without moving money', async () => {
      const goal = goalPendingSinceMarch();

      await service.resolveReminder(ANA, goal.id, '2027-04', {
        action: ReminderAction.SKIP,
      });

      expect(goalsRepository.createSkippedMonth).toHaveBeenCalledWith(
        goal.id,
        day('2027-04-01'),
      );
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it.each([
      ['a month with a contribution', '2027-02'],
      ['a future month', '2027-06'],
    ])('returns 409 for %s', async (_, month) => {
      const goal = goalPendingSinceMarch();

      for (const action of [ReminderAction.CONFIRM, ReminderAction.SKIP]) {
        await expect(
          service.resolveReminder(ANA, goal.id, month, { action, value: 500 }),
        ).rejects.toBeInstanceOf(ConflictException);
      }
      expect(transactionsRepository.create).not.toHaveBeenCalled();
      expect(goalsRepository.createSkippedMonth).not.toHaveBeenCalled();
    });

    it('returns 409 for a month already marked as "não aportei"', async () => {
      const goal = goalPendingSinceMarch();
      goal.skippedMonths = [{ id: 'skip', month: day('2027-03-01') }];

      await expect(
        service.resolveReminder(ANA, goal.id, '2027-03', {
          action: ReminderAction.SKIP,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(goalsRepository.createSkippedMonth).not.toHaveBeenCalled();
    });

    it('returns 409 when the database already has the mark (P2002)', async () => {
      const goal = goalPendingSinceMarch();
      goalsRepository.createSkippedMonth.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '4.16.1',
        }),
      );

      await expect(
        service.resolveReminder(ANA, goal.id, '2027-03', {
          action: ReminderAction.SKIP,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns 409 for months before creation or outside the period', async () => {
      const goal = makeGoal({
        startDate: day('2027-01-10'),
        endDate: day('2027-12-31'),
        createdAt: new Date('2027-03-10T15:00:00Z'),
      });
      goals.push(goal);

      for (const month of ['2027-01', '2027-02', '2028-01']) {
        await expect(
          service.resolveReminder(ANA, goal.id, month, {
            action: ReminderAction.CONFIRM,
            value: 500,
          }),
        ).rejects.toBeInstanceOf(ConflictException);
      }
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('returns 409 when the goal is not in progress', async () => {
      const goal = makeGoal({ initialSaved: 10000 });
      goals.push(goal);

      await expect(
        service.resolveReminder(ANA, goal.id, '2027-05', {
          action: ReminderAction.SKIP,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findReminders', () => {
    it('lists goals in progress only, by month and then by goal creation', async () => {
      const later = makeGoal({
        name: 'Carro',
        startDate: day('2027-03-01'),
        createdAt: new Date('2027-02-01T15:00:00Z'),
      });
      const earlier = makeGoal({
        name: 'Casa',
        startDate: day('2027-04-01'),
        createdAt: new Date('2027-01-15T15:00:00Z'),
      });
      const scheduled = makeGoal({ startDate: day('2027-06-01') });
      const completed = makeGoal({ initialSaved: 10000 });
      const fromBia = makeGoal({ userId: BIA, bankAccountId: 'bia-account' });
      goals.push(later, earlier, scheduled, completed, fromBia);

      const reminders = await service.findReminders(ANA);

      expect(
        reminders.map((reminder) => [reminder.month, reminder.goalName]),
      ).toEqual([
        ['2027-03', 'Carro'],
        ['2027-04', 'Casa'],
        ['2027-04', 'Carro'],
        ['2027-05', 'Casa'],
        ['2027-05', 'Carro'],
      ]);
      expect(reminders[0]).toMatchObject({
        goalId: later.id,
        monthlyContribution: 500,
        bankAccount: { id: 'nubank', name: 'Nubank' },
      });
    });
  });

  describe('user scoping', () => {
    it("lists and sums only the caller's goals", async () => {
      goals.push(
        makeGoal({ initialSaved: 100, monthlyContribution: 300 }),
        makeGoal({
          userId: BIA,
          bankAccountId: 'bia-account',
          initialSaved: 900,
          monthlyContribution: 700,
        }),
      );

      const list = await service.findAllByUserId(ANA);
      const summary = await service.getSummary(ANA);

      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ totalSaved: 100, status: 'IN_PROGRESS' });
      expect(summary).toMatchObject({
        monthlyContribution: 300,
        totalSaved: 100,
      });
      expect(summary.savedByMonth[summary.savedByMonth.length - 1].saved).toBe(
        100,
      );
    });

    it("returns 404 for another user's goal", async () => {
      const goal = makeGoal({ userId: BIA, bankAccountId: 'bia-account' });
      goals.push(goal);

      await expect(service.findOne(ANA, goal.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.update(ANA, goal.id, goalBody),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove(ANA, goal.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.contribute(ANA, goal.id, {
          value: 1,
          date: '2027-05-10T15:00:00Z',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.archive(ANA, goal.id, { returnMoney: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns the history of contributions, "não aportei" marks and withdrawals by date', async () => {
      const goal = makeGoal({
        skippedMonths: [{ id: 'skip', month: day('2027-02-01') }],
      });
      goals.push(goal);
      transactionsRepository.findManyByGoalId.mockResolvedValue([
        {
          id: 'c1',
          type: 'EXPENSE',
          value: 500,
          date: noon('2027-01-05'),
          bankAccount: { id: 'nubank', name: 'Nubank' },
        },
        {
          id: 'w1',
          type: 'INCOME',
          value: 500,
          date: noon('2027-03-20'),
          bankAccount: { id: 'nubank', name: 'Nubank' },
        },
      ]);

      const detail = await service.findOne(ANA, goal.id);

      expect(detail.history.map((item) => [item.kind, item.id])).toEqual([
        ['CONTRIBUTION', 'c1'],
        ['SKIPPED', 'skip'],
        ['WITHDRAWAL', 'w1'],
      ]);
      expect(detail.resolvedMonths).toEqual(['2027-02']);
    });
  });

  describe('update', () => {
    it('refuses an archived goal', async () => {
      const goal = makeGoal({ archivedAt: new Date('2027-04-01T12:00:00Z') });
      goals.push(goal);

      await expect(
        service.update(ANA, goal.id, goalBody),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(goalsRepository.update).not.toHaveBeenCalled();
    });

    it('validates the owner of a new source account', async () => {
      const goal = makeGoal();
      goals.push(goal);

      await expect(
        service.update(ANA, goal.id, {
          ...goalBody,
          bankAccountId: 'bia-account',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      await service.update(ANA, goal.id, {
        ...goalBody,
        bankAccountId: 'inter',
      });
      expect(goalsRepository.update).toHaveBeenCalledWith(
        goal.id,
        expect.objectContaining({ bankAccountId: 'inter' }),
      );
    });
  });

  describe('remove', () => {
    it('returns 409 for a goal with linked transactions', async () => {
      const goal = makeGoal();
      goal.transactions = [contribution(goal, '2027-01-05', 500)];
      goals.push(goal);

      await expect(service.remove(ANA, goal.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(goalsRepository.delete).not.toHaveBeenCalled();
    });

    it('returns 409 when the database refuses the delete (P2003)', async () => {
      const goal = makeGoal();
      goals.push(goal);
      goalsRepository.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          { code: 'P2003', clientVersion: '4.16.1' },
        ),
      );

      await expect(service.remove(ANA, goal.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deletes a goal without linked transactions', async () => {
      const goal = makeGoal({
        skippedMonths: [{ id: 'skip', month: day('2027-01-01') }],
      });
      goals.push(goal);

      await service.remove(ANA, goal.id);

      expect(goalsRepository.delete).toHaveBeenCalledWith(goal.id);
    });

    it('refuses an archived goal', async () => {
      const goal = makeGoal({ archivedAt: new Date('2027-04-01T12:00:00Z') });
      goals.push(goal);

      await expect(service.remove(ANA, goal.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(goalsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('archive', () => {
    async function useRealRepository(goal: GoalWithRelations) {
      goals.push(goal);
      const fake = fakePrismaForArchive(goal);
      prismaForArchive = fake.prisma;
      await buildService();
      return fake.state;
    }

    it('AE7: returns the money to each account in the same database transaction that archives the goal', async () => {
      const goal = makeGoal({ initialSaved: 1000 });
      goal.transactions = [
        contribution(goal, '2027-01-05', 500),
        contribution(goal, '2027-02-05', 500, 'inter'),
        contribution(goal, '2027-03-05', 500),
      ];
      const state = await useRealRepository(goal);

      await service.archive(ANA, goal.id, { returnMoney: true });

      expect(state.archivedAt).toBeInstanceOf(Date);
      expect(state.operations).toEqual([
        'updateMany',
        'findUnique',
        'createMany',
      ]);
      expect(state.withdrawals).toEqual([
        {
          userId: ANA,
          bankAccountId: 'nubank',
          categoryId: 'ana-goal-income',
          goalId: goal.id,
          name: 'Resgate: Viagem',
          value: 1000,
          date: noon('2027-05-10'),
          type: 'INCOME',
        },
        {
          userId: ANA,
          bankAccountId: 'inter',
          categoryId: 'ana-goal-income',
          goalId: goal.id,
          name: 'Resgate: Viagem',
          value: 500,
          date: noon('2027-05-10'),
          type: 'INCOME',
        },
      ]);
    });

    it('only archives when the money is kept', async () => {
      const goal = makeGoal();
      goal.transactions = [contribution(goal, '2027-01-05', 500)];
      const state = await useRealRepository(goal);

      await service.archive(ANA, goal.id, { returnMoney: false });

      expect(state.archivedAt).toBeInstanceOf(Date);
      expect(state.withdrawals).toEqual([]);
    });

    it('creates no withdrawal for a goal without contributions', async () => {
      const state = await useRealRepository(makeGoal({ initialSaved: 1000 }));

      await service.archive(ANA, goals[0].id, { returnMoney: true });

      expect(state.archivedAt).toBeInstanceOf(Date);
      expect(state.withdrawals).toEqual([]);
    });

    it('returns 409 and creates no withdrawal when another request archived it first', async () => {
      const goal = makeGoal();
      goal.transactions = [contribution(goal, '2027-01-05', 500)];
      const state = await useRealRepository(goal);
      state.archivedAt = new Date('2027-05-10T15:00:00Z');

      await expect(
        service.archive(ANA, goal.id, { returnMoney: true }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(state.operations).toEqual(['updateMany']);
      expect(state.withdrawals).toEqual([]);
    });

    it('returns 409 for a goal that is already archived', async () => {
      const goal = makeGoal({ archivedAt: new Date('2027-04-01T12:00:00Z') });
      goals.push(goal);

      await expect(
        service.archive(ANA, goal.id, { returnMoney: false }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(goalsRepository.archive).not.toHaveBeenCalled();
    });
  });
});

describe('goal request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (metatype: any, body: object) =>
    pipe.transform(body, { type: 'body', metatype });

  it.each([-10, 0, 10.555])(
    'rejects a manual contribution of %p with 400',
    async (value) => {
      await expect(
        validate(CreateContributionDto, {
          value,
          date: '2027-05-10T15:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([-10, 0, 10.555])(
    'rejects a confirmed reminder of %p with 400',
    async (value) => {
      await expect(
        validate(ResolveReminderDto, { action: 'CONFIRM', value }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('accepts "não aportei" without a value and two-decimal values', async () => {
    await expect(
      validate(ResolveReminderDto, { action: 'SKIP' }),
    ).resolves.toEqual({ action: 'SKIP' });
    await expect(
      validate(CreateContributionDto, {
        value: 10.55,
        date: '2027-05-10T15:00:00.000Z',
      }),
    ).resolves.toEqual({ value: 10.55, date: '2027-05-10T15:00:00.000Z' });
  });
});
