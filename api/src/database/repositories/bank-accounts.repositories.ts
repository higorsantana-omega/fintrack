import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: any) {
    return this.prismaService.bankAccount.create({
      data: { ...data },
    });
  }

  async findAllByUserId(userId: string) {
    return this.prismaService.bankAccount.findMany({
      where: { userId },
    });
  }

  async findFirst(userId: string, bankAccountId: string) {
    return this.prismaService.bankAccount.findFirst({
      where: { userId, id: bankAccountId },
    });
  }

  update(bankAccountId: string, updateDto: any) {
    return this.prismaService.bankAccount.update({
      where: { id: bankAccountId },
      data: updateDto,
    });
  }
}
