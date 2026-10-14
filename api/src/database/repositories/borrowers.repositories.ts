import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const borrowerInclude = Prisma.validator<Prisma.BorrowerInclude>()({
  transactions: {
    select: {
      id: true,
      name: true,
      value: true,
      date: true,
      type: true,
      bankAccountId: true,
      bankAccount: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: 'desc' }, { id: 'asc' }],
  },
});

export type BorrowerWithRelations = Prisma.BorrowerGetPayload<{
  include: typeof borrowerInclude;
}>;

export type BorrowerData = { name: string; openingBalance?: number };

@Injectable()
export class BorrowersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(userId: string, data: BorrowerData) {
    return this.prismaService.borrower.create({ data: { userId, ...data } });
  }

  findManyByUserId(userId: string): Promise<BorrowerWithRelations[]> {
    return this.prismaService.borrower.findMany({
      where: { userId },
      include: borrowerInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findFirst(
    userId: string,
    borrowerId: string,
  ): Promise<BorrowerWithRelations> {
    return this.prismaService.borrower.findFirst({
      where: { userId, id: borrowerId },
      include: borrowerInclude,
    });
  }

  update(borrowerId: string, data: BorrowerData) {
    return this.prismaService.borrower.update({
      where: { id: borrowerId },
      data,
    });
  }

  delete(borrowerId: string) {
    return this.prismaService.borrower.delete({ where: { id: borrowerId } });
  }
}
