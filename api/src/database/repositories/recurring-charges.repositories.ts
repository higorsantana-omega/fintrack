import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type RecurringChargeData = {
  categoryId: string;
  description: string;
  value: number;
};

@Injectable()
export class RecurringChargesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(
    creditCardId: string,
    data: RecurringChargeData & {
      firstChargeDate: Date;
      materializedThrough: Date;
    },
  ) {
    return this.prismaService.recurringCharge.create({
      data: { creditCardId, ...data },
    });
  }

  update(recurringChargeId: string, data: RecurringChargeData) {
    return this.prismaService.recurringCharge.update({
      where: { id: recurringChargeId },
      data,
    });
  }
}
