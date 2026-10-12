import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: Prisma.BankAccountUncheckedCreateInput) {
    return this.prismaService.bankAccount.create({ data });
  }

  async findAllByUserId(userId: string) {
    return this.prismaService.bankAccount.findMany({
      where: { userId },
      include: { transactions: { select: { type: true, value: true } } },
    });
  }

  async findFirst(userId: string, bankAccountId: string) {
    return this.prismaService.bankAccount.findFirst({
      where: { userId, id: bankAccountId },
    });
  }

  update(bankAccountId: string, data: Prisma.BankAccountUncheckedUpdateInput) {
    return this.prismaService.bankAccount.update({
      where: { id: bankAccountId },
      data,
    });
  }

  delete(bankAccountId: string) {
    return this.prismaService.bankAccount.delete({
      where: { id: bankAccountId },
    });
  }
}
