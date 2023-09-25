import { Injectable } from '@nestjs/common';
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

  async create(data: any) {
    return this.prismaService.transaction.create({ data });
  }

  async findFirst(transactionId: string) {
    return this.prismaService.transaction.findFirst({
      where: { id: transactionId },
    });
  }

  async update(transactionId: string, data: any) {
    return this.prismaService.transaction.update({
      where: { id: transactionId },
      data: { ...data },
    });
  }

  async delete(transactionId: string) {
    return this.prismaService.transaction.delete({
      where: { id: transactionId },
    });
  }
}
