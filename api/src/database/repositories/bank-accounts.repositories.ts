import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: any) {
    return this.prismaService.bankAccount.create({
      data: { ...data },
    });
  }

  async findAllByUserId(userId: string) {
    return this.prismaService.category.findMany({
      where: { userId },
    });
  }
}
