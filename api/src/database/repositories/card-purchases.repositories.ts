import { Injectable } from '@nestjs/common';
import { CardPurchaseKind, Prisma } from '@prisma/client';
import { getMonthStart, toNoonUtc } from 'src/shared/calendar';
import {
  CardCycle,
  RecurringChargeRule,
  getChargeDates,
  getChargesToMaterialize,
  getInvoiceMonth,
} from 'src/modules/cards/card-calculations';
import { PrismaService } from '../prisma.service';
import { isPrismaError } from '../prisma-errors';

export type RuleToMaterialize = RecurringChargeRule & {
  creditCardId: string;
  categoryId: string | null;
  description: string;
};

export type PurchaseData = {
  categoryId: string | null;
  description: string;
  totalValue: number;
  purchaseDate: Date;
  installmentsCount: number;
  currentInstallment: number;
};

export type NewPurchaseData = PurchaseData & {
  creditCardId: string;
  kind: CardPurchaseKind;
  anchorInvoiceMonth: Date | null;
};

export type InstallmentData = {
  number: number;
  value: number;
  invoiceMonth: Date;
};

/** Creates one charge of a recurring rule as a single-installment purchase. */
function createCharge(
  tx: Prisma.TransactionClient,
  rule: RuleToMaterialize,
  cycles: CardCycle[],
  date: Date,
) {
  return tx.cardPurchase.create({
    data: {
      creditCardId: rule.creditCardId,
      categoryId: rule.categoryId,
      recurringChargeId: rule.id,
      kind: 'PURCHASE',
      description: rule.description,
      totalValue: rule.value,
      purchaseDate: toNoonUtc(date),
      occurrenceDate: date,
      installments: {
        create: {
          number: 1,
          value: rule.value,
          invoiceMonth: getMonthStart(getInvoiceMonth(cycles, date)),
        },
      },
    },
  });
}

@Injectable()
export class CardPurchasesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Turns the user's recurring charges due up to today into purchases
   * (KTD6). Each rule reserves its range by moving the watermark first, so
   * concurrent reads never create the same charge twice.
   */
  async materializeRecurringCharges(userId: string, today: Date) {
    const rules = await this.prismaService.recurringCharge.findMany({
      where: { creditCard: { userId }, materializedThrough: { lt: today } },
      include: {
        creditCard: {
          select: {
            cycles: {
              select: { closingDay: true, dueDay: true, effectiveFrom: true },
            },
          },
        },
      },
    });

    for (const rule of rules) {
      await this.materialize(rule, rule.creditCard.cycles, today);
    }
  }

  private async materialize(
    rule: RuleToMaterialize,
    cycles: CardCycle[],
    today: Date,
  ) {
    const chargeDates = getChargesToMaterialize(rule, today);

    try {
      await this.prismaService.$transaction(async (tx) => {
        const { count } = await tx.recurringCharge.updateMany({
          where: { id: rule.id, materializedThrough: rule.materializedThrough },
          data: { materializedThrough: today },
        });

        if (count === 0) return;

        for (const date of chargeDates) {
          await createCharge(tx, rule, cycles, date);
        }
      });
    } catch (error) {
      // Another read already created this charge; the whole transaction was
      // rolled back and that read owns the range.
      if (!isPrismaError(error, 'P2002')) throw error;
    }
  }

  /**
   * Cancels the rule from today and, in the same transaction, creates the
   * charges dated before today that no read created yet (R22, KTD6).
   * Resolves to false when a read moved the watermark first.
   */
  cancelRecurringCharge(
    rule: RuleToMaterialize,
    cycles: CardCycle[],
    today: Date,
  ) {
    const chargeDates = getChargeDates(
      { ...rule, cancelledAt: today },
      rule.materializedThrough,
      today,
    );

    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.recurringCharge.updateMany({
        where: {
          id: rule.id,
          cancelledAt: null,
          materializedThrough: rule.materializedThrough,
        },
        data: {
          cancelledAt: today,
          materializedThrough:
            rule.materializedThrough > today ? rule.materializedThrough : today,
        },
      });

      if (count === 0) return false;

      for (const date of chargeDates) {
        await createCharge(tx, rule, cycles, date);
      }

      return true;
    });
  }

  create(data: NewPurchaseData, installments: InstallmentData[]) {
    return this.prismaService.cardPurchase.create({
      data: { ...data, installments: { create: installments } },
    });
  }

  /** With installments, replaces every installment row in one transaction (KTD5). */
  update(
    purchaseId: string,
    data: PurchaseData,
    installments: InstallmentData[] | null,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      if (installments) {
        await tx.cardInstallment.deleteMany({ where: { purchaseId } });
        await tx.cardInstallment.createMany({
          data: installments.map((installment) => ({
            purchaseId,
            ...installment,
          })),
        });
      }

      return tx.cardPurchase.update({ where: { id: purchaseId }, data });
    });
  }

  delete(purchaseId: string) {
    return this.prismaService.cardPurchase.delete({
      where: { id: purchaseId },
    });
  }
}
