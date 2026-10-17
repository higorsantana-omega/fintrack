import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const categorySelect = {
  select: { id: true, name: true, key: true, parentId: true, icon: true },
};

const cardInclude = Prisma.validator<Prisma.CreditCardInclude>()({
  cycles: {
    select: { closingDay: true, dueDay: true, effectiveFrom: true },
    orderBy: { effectiveFrom: 'asc' },
  },
  purchases: {
    select: {
      id: true,
      kind: true,
      description: true,
      totalValue: true,
      purchaseDate: true,
      installmentsCount: true,
      currentInstallment: true,
      anchorInvoiceMonth: true,
      recurringChargeId: true,
      category: categorySelect,
      installments: {
        select: { number: true, value: true, invoiceMonth: true },
        orderBy: { number: 'asc' },
      },
    },
    orderBy: { purchaseDate: 'asc' },
  },
  payments: {
    select: {
      id: true,
      name: true,
      bankAccountId: true,
      value: true,
      date: true,
      type: true,
      cardInvoiceMonth: true,
      bankAccount: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: 'asc' },
  },
  recurringCharges: {
    select: {
      id: true,
      description: true,
      value: true,
      firstChargeDate: true,
      materializedThrough: true,
      cancelledAt: true,
      category: categorySelect,
    },
    orderBy: { createdAt: 'asc' },
  },
});

export type CardWithRelations = Prisma.CreditCardGetPayload<{
  include: typeof cardInclude;
}>;

export type CardData = { name: string; color: string; limit: number };

export type CycleData = {
  closingDay: number;
  dueDay: number;
  effectiveFrom: Date;
};

@Injectable()
export class CreditCardsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(userId: string, data: CardData, cycle: CycleData) {
    return this.prismaService.creditCard.create({
      data: {
        userId,
        name: data.name,
        color: data.color,
        limit: data.limit,
        cycles: { create: cycle },
      },
    });
  }

  findManyByUserId(userId: string): Promise<CardWithRelations[]> {
    return this.prismaService.creditCard.findMany({
      where: { userId },
      include: cardInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  findFirst(userId: string, cardId: string): Promise<CardWithRelations> {
    return this.prismaService.creditCard.findFirst({
      where: { userId, id: cardId },
      include: cardInclude,
    });
  }

  /**
   * Updates the card and, with a cycle, records the version starting at its
   * month, dropping any version that would start after it (KTD3).
   */
  update(cardId: string, data: CardData, cycle: CycleData | null) {
    return this.prismaService.$transaction(async (tx) => {
      if (cycle) {
        await tx.creditCardCycle.deleteMany({
          where: {
            creditCardId: cardId,
            effectiveFrom: { gt: cycle.effectiveFrom },
          },
        });
        await tx.creditCardCycle.upsert({
          where: {
            creditCardId_effectiveFrom: {
              creditCardId: cardId,
              effectiveFrom: cycle.effectiveFrom,
            },
          },
          create: { creditCardId: cardId, ...cycle },
          update: { closingDay: cycle.closingDay, dueDay: cycle.dueDay },
        });
      }

      return tx.creditCard.update({
        where: { id: cardId },
        data: { name: data.name, color: data.color, limit: data.limit },
      });
    });
  }

  delete(cardId: string) {
    return this.prismaService.creditCard.delete({ where: { id: cardId } });
  }

  /**
   * Archives the card and cancels its recurring charges from today, in one
   * database transaction. Resolves to false when it was already archived.
   */
  archive(cardId: string, today: Date) {
    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.creditCard.updateMany({
        where: { id: cardId, archivedAt: null },
        data: { archivedAt: new Date() },
      });

      if (count === 0) return false;

      await tx.recurringCharge.updateMany({
        where: { creditCardId: cardId, cancelledAt: null },
        data: { cancelledAt: today },
      });

      return true;
    });
  }
}
