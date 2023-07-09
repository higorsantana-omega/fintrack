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

  async findMany(userId: string) {
    return this.prismaService.category.findMany({
      where: { userId },
    });
  }
}
