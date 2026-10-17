import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(userId: string) {
    return this.prismaService.category.findMany({
      where: { userId },
    });
  }

  async findByKey(userId: string, key: string, type: TransactionType) {
    return this.prismaService.category.findFirst({
      where: { userId, key, type },
    });
  }

  async findFirst(userId: string, categoryId: string) {
    return this.prismaService.category.findFirst({
      where: { userId, id: categoryId },
    });
  }
}
