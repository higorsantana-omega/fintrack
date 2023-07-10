import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(userId: string) {
    return this.prismaService.transaction.findMany({
      where: { userId },
    });
  }

  async create(data: any) {
    return this.prismaService.transaction.create({ data });
  }
}
