import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { getWithdrawalsByAccount } from 'src/modules/goals/goal-calculations';

const goalInclude = Prisma.validator<Prisma.GoalInclude>()({
  bankAccount: { select: { id: true, name: true, color: true } },
  transactions: {
    select: {
      id: true,
      goalId: true,
      bankAccountId: true,
      value: true,
      date: true,
      type: true,
    },
  },
  skippedMonths: { select: { id: true, month: true } },
});

export type GoalWithRelations = Prisma.GoalGetPayload<{
  include: typeof goalInclude;
}>;

export type GoalData = {
  bankAccountId: string;
  name: string;
  targetAmount: number;
  monthlyContribution: number;
  initialSaved: number;
  contributionDay: number;
  startDate: Date;
  endDate: Date;
};

export type WithdrawalData = {
  userId: string;
  categoryId: string;
  namePrefix: string;
  date: Date;
};

@Injectable()
export class GoalsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(userId: string, data: GoalData) {
    return this.prismaService.goal.create({
      data: {
        userId,
        bankAccountId: data.bankAccountId,
        name: data.name,
        targetAmount: data.targetAmount,
        monthlyContribution: data.monthlyContribution,
        initialSaved: data.initialSaved,
        contributionDay: data.contributionDay,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  findManyByUserId(userId: string): Promise<GoalWithRelations[]> {
    return this.prismaService.goal.findMany({
      where: { userId },
      include: goalInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  findFirst(userId: string, goalId: string): Promise<GoalWithRelations> {
    return this.prismaService.goal.findFirst({
      where: { userId, id: goalId },
      include: goalInclude,
    });
  }

  update(goalId: string, data: GoalData) {
    return this.prismaService.goal.update({
      where: { id: goalId },
      data: {
        bankAccountId: data.bankAccountId,
        name: data.name,
        targetAmount: data.targetAmount,
        monthlyContribution: data.monthlyContribution,
        initialSaved: data.initialSaved,
        contributionDay: data.contributionDay,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  delete(goalId: string) {
    return this.prismaService.goal.delete({ where: { id: goalId } });
  }

  createSkippedMonth(goalId: string, month: Date) {
    return this.prismaService.goalSkippedMonth.create({
      data: { goalId, month },
    });
  }

  /**
   * Archives the goal and, when `withdrawal` is given, returns the
   * contributions to each account they came from, in one database
   * transaction. Resolves to false when the goal was already archived.
   */
  archive(goalId: string, withdrawal: WithdrawalData | null) {
    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.goal.updateMany({
        where: { id: goalId, archivedAt: null },
        data: { archivedAt: new Date() },
      });

      if (count === 0) return false;
      if (!withdrawal) return true;

      const goal = await tx.goal.findUnique({
        where: { id: goalId },
        include: goalInclude,
      });
      const withdrawals = getWithdrawalsByAccount(goal);

      if (withdrawals.length > 0) {
        await tx.transaction.createMany({
          data: withdrawals.map(({ bankAccountId, value }) => ({
            userId: withdrawal.userId,
            bankAccountId,
            categoryId: withdrawal.categoryId,
            goalId,
            name: `${withdrawal.namePrefix}${goal.name}`,
            value,
            date: withdrawal.date,
            type: 'INCOME' as const,
          })),
        });
      }

      return true;
    });
  }
}
