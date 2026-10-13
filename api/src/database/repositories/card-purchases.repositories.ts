import { Injectable } from '@nestjs/common';
import { getMonthStart, toNoonUtc } from 'src/shared/calendar';
import {
  CardCycle,
  RecurringChargeRule,
  getChargesToMaterialize,
  getInvoiceMonth,
} from 'src/modules/cards/card-calculations';
import { PrismaService } from '../prisma.service';
import { isPrismaError } from '../prisma-errors';

type RuleToMaterialize = RecurringChargeRule & {
  creditCardId: string;
  categoryId: string | null;
  description: string;
  creditCard: { cycles: CardCycle[] };
};

@Injectable()
export class CardPurchasesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Turns the user's recurring charges due up to today into purchases
   * (KTD6). Each rule reserves its range by moving the watermark first, so
   * concurrent reads never create the same charge twice.
   */
  async materializeRecurringCharges(userId: string, today: Date) {
    const rules: RuleToMaterialize[] =
      await this.prismaService.recurringCharge.findMany({
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
      await this.materialize(rule, today);
    }
  }

  private async materialize(rule: RuleToMaterialize, today: Date) {
    const chargeDates = getChargesToMaterialize(rule, today);

    try {
      await this.prismaService.$transaction(async (tx) => {
        const { count } = await tx.recurringCharge.updateMany({
          where: { id: rule.id, materializedThrough: rule.materializedThrough },
          data: { materializedThrough: today },
        });

        if (count === 0) return;

        for (const date of chargeDates) {
          await tx.cardPurchase.create({
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
                  invoiceMonth: getMonthStart(
                    getInvoiceMonth(rule.creditCard.cycles, date),
                  ),
                },
              },
            },
          });
        }
      });
    } catch (error) {
      // Another read already created this charge; the whole transaction was
      // rolled back and that read owns the range.
      if (!isPrismaError(error, 'P2002')) throw error;
    }
  }
}
