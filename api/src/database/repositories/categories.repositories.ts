import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
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

  /** The groups of a type when `parentId` is null, else the group's subcategories. */
  async findSiblings(
    userId: string,
    type: TransactionType,
    parentId: string | null,
  ) {
    return this.prismaService.category.findMany({
      where: { userId, type, parentId },
    });
  }

  async create(data: Prisma.CategoryUncheckedCreateInput) {
    return this.prismaService.category.create({ data });
  }

  async update(categoryId: string, data: Prisma.CategoryUncheckedUpdateInput) {
    return this.prismaService.category.update({
      where: { id: categoryId },
      data,
    });
  }

  /**
   * Moves every item of the categories to `destinationId` and deletes them,
   * all or nothing. Archived cards' items are reached too, since nothing here
   * goes through the cards service.
   */
  async moveItemsAndDelete(categoryIds: string[], destinationId: string) {
    const where = { categoryId: { in: categoryIds } };
    const data = { categoryId: destinationId };

    await this.prismaService.$transaction([
      this.prismaService.transaction.updateMany({ where, data }),
      this.prismaService.cardPurchase.updateMany({ where, data }),
      this.prismaService.recurringCharge.updateMany({ where, data }),
      this.prismaService.category.deleteMany({
        where: { id: { in: categoryIds } },
      }),
    ]);
  }
}
