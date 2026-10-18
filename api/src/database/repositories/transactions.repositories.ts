import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { FindAllFilters } from 'src/modules/transactions/transactions.service';

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(userId: string, filters: FindAllFilters) {
    return this.prismaService.transaction.findMany({
      where: {
        userId,
        bankAccountId: filters.bankAccountId,
        type: filters.type,
        date: {
          gte: new Date(Date.UTC(filters.year, filters.month)),
          lt: new Date(Date.UTC(filters.year, filters.month + 1)),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            key: true,
            parentId: true,
            icon: true,
          },
        },
      },
    });
  }

  /** The month's transactions with what the category totals need (R9, R37). */
  async findManyForSummary(userId: string, from: Date, to: Date) {
    return this.prismaService.transaction.findMany({
      where: { userId, date: { gte: from, lt: to } },
      select: {
        id: true,
        name: true,
        value: true,
        date: true,
        type: true,
        categoryId: true,
        creditCardId: true,
        goalId: true,
        borrowerId: true,
        debtId: true,
        bankAccount: { select: { id: true, name: true } },
        category: { select: { key: true } },
      },
    });
  }

  async findManyByGoalId(goalId: string) {
    return this.prismaService.transaction.findMany({
      where: { goalId },
      orderBy: { date: 'asc' },
      include: { bankAccount: { select: { id: true, name: true } } },
    });
  }

  async create(data: Prisma.TransactionUncheckedCreateInput) {
    return this.prismaService.transaction.create({ data });
  }

  async findFirst(userId: string, transactionId: string) {
    return this.prismaService.transaction.findFirst({
      where: { userId, id: transactionId },
    });
  }

  async update(
    transactionId: string,
    data: Prisma.TransactionUncheckedUpdateInput,
  ) {
    return this.prismaService.transaction.update({
      where: { id: transactionId },
      data,
    });
  }

  async delete(transactionId: string) {
    return this.prismaService.transaction.delete({
      where: { id: transactionId },
    });
  }
}
