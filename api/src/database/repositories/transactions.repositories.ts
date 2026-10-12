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
            icon: true,
          },
        },
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
