import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardWithRelations } from 'src/database/repositories/credit-cards.repositories';
import {
  CardPurchasesRepository,
  PurchaseData,
} from 'src/database/repositories/card-purchases.repositories';
import { RecurringChargesRepository } from 'src/database/repositories/recurring-charges.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import {
  fromCents,
  getMonthKey,
  getMonthStart,
  getToday,
  parseMonthKey,
  toCalendarDate,
  toCents,
  toNoonUtc,
} from 'src/shared/calendar';
import { GOAL_CATEGORY_ICON } from '../goals/goals.constants';
import { CARD_PAYMENT_CATEGORY_ICON } from '../categories/categories.constants';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';
import {
  CardPurchaseKind,
  CreateCardPurchaseDto,
} from './dto/create-card-purchase.dto';
import { UpdateCardPurchaseDto } from './dto/update-card-purchase.dto';
import { CreateRecurringChargeDto } from './dto/create-recurring-charge.dto';
import { UpdateRecurringChargeDto } from './dto/update-recurring-charge.dto';
import { ARCHIVED_CARD_MESSAGE } from './cards.constants';
import {
  addDays,
  getInstallments,
  getInvoiceDates,
  getInvoiceMonth,
} from './card-calculations';

const EXCLUDED_CATEGORY_ICONS = [
  GOAL_CATEGORY_ICON,
  CARD_PAYMENT_CATEGORY_ICON,
];

type EntryFields = {
  value: number;
  date: string;
  installmentsCount?: number;
  currentInstallment?: number;
};

@Injectable()
export class CardEntriesService {
  constructor(
    private readonly cardPurchasesRepository: CardPurchasesRepository,
    private readonly recurringChargesRepository: RecurringChargesRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly validateCardOwnershipService: ValidateCardOwnershipService,
  ) {}

  async createPurchase(
    userId: string,
    cardId: string,
    createCardPurchaseDto: CreateCardPurchaseDto,
  ) {
    const card = await this.getWritableCard(userId, cardId);
    const isRefund = createCardPurchaseDto.kind === CardPurchaseKind.REFUND;
    const { anchorInvoiceMonth } = createCardPurchaseDto;

    if (
      isRefund &&
      (createCardPurchaseDto.installmentsCount !== undefined ||
        createCardPurchaseDto.currentInstallment !== undefined ||
        anchorInvoiceMonth !== undefined)
    ) {
      throw new BadRequestException('A refund has no installments.');
    }

    const anchorMonth =
      anchorInvoiceMonth === undefined
        ? null
        : parseMonthKey(anchorInvoiceMonth);
    if (anchorMonth !== null) this.assertValidAnchor(card, anchorMonth);

    await this.validateCategory(
      userId,
      createCardPurchaseDto.categoryId,
      isRefund,
    );

    const { data, installments } = this.toPurchase(
      card,
      createCardPurchaseDto,
      anchorMonth,
    );

    return this.cardPurchasesRepository.create(
      {
        ...data,
        creditCardId: card.id,
        kind: createCardPurchaseDto.kind,
        anchorInvoiceMonth:
          anchorMonth === null ? null : getMonthStart(anchorMonth),
      },
      installments,
    );
  }

  async updatePurchase(
    userId: string,
    cardId: string,
    purchaseId: string,
    updateCardPurchaseDto: UpdateCardPurchaseDto,
  ) {
    const card = await this.getWritableCard(userId, cardId);
    const purchase = this.findPurchase(card, purchaseId);
    const isInstallmentPurchase = purchase.installmentsCount > 1;

    if (
      (updateCardPurchaseDto.installmentsCount !== undefined) !==
      isInstallmentPurchase
    ) {
      throw new BadRequestException(
        'A purchase cannot change between single and installments.',
      );
    }

    await this.validateCategory(
      userId,
      updateCardPurchaseDto.categoryId,
      purchase.kind === 'REFUND',
    );

    const anchorMonth = purchase.anchorInvoiceMonth
      ? getMonthKey(purchase.anchorInvoiceMonth)
      : null;
    const { data, installments } = this.toPurchase(
      card,
      updateCardPurchaseDto,
      anchorMonth,
    );
    const rowsChanged =
      toCents(data.totalValue) !== toCents(purchase.totalValue) ||
      data.purchaseDate.getTime() !== purchase.purchaseDate.getTime() ||
      data.installmentsCount !== purchase.installmentsCount ||
      data.currentInstallment !== purchase.currentInstallment;

    return this.cardPurchasesRepository.update(
      purchaseId,
      data,
      rowsChanged ? installments : null,
    );
  }

  async removePurchase(userId: string, cardId: string, purchaseId: string) {
    const card = await this.getWritableCard(userId, cardId);
    this.findPurchase(card, purchaseId);

    await this.cardPurchasesRepository.delete(purchaseId);

    return null;
  }

  async createRecurringCharge(
    userId: string,
    cardId: string,
    createRecurringChargeDto: CreateRecurringChargeDto,
  ) {
    const card = await this.getWritableCard(userId, cardId);
    await this.validateCategory(
      userId,
      createRecurringChargeDto.categoryId,
      false,
    );

    // The first charge may not fall before the last closed invoice (R19).
    const firstChargeDate = toCalendarDate(
      new Date(createRecurringChargeDto.firstChargeDate),
    );
    const lastClosedMonth = getInvoiceMonth(card.cycles, getToday()) - 1;
    const { periodStart } = getInvoiceDates(card.cycles, lastClosedMonth);
    if (firstChargeDate < periodStart) {
      throw new BadRequestException(
        'The first charge cannot be before the last closed invoice.',
      );
    }

    return this.recurringChargesRepository.create(card.id, {
      categoryId: createRecurringChargeDto.categoryId,
      description: createRecurringChargeDto.description,
      value: createRecurringChargeDto.value,
      firstChargeDate,
      materializedThrough: addDays(firstChargeDate, -1),
    });
  }

  async updateRecurringCharge(
    userId: string,
    cardId: string,
    recurringChargeId: string,
    updateRecurringChargeDto: UpdateRecurringChargeDto,
  ) {
    // Charges due up to today keep the value they were charged with.
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      getToday(),
    );
    const card = await this.getWritableCard(userId, cardId);
    this.findActiveRecurringCharge(card, recurringChargeId);
    await this.validateCategory(
      userId,
      updateRecurringChargeDto.categoryId,
      false,
    );

    return this.recurringChargesRepository.update(recurringChargeId, {
      categoryId: updateRecurringChargeDto.categoryId,
      description: updateRecurringChargeDto.description,
      value: updateRecurringChargeDto.value,
    });
  }

  async cancelRecurringCharge(
    userId: string,
    cardId: string,
    recurringChargeId: string,
  ) {
    const today = getToday();

    // A read may move the watermark between loading and cancelling; the
    // second attempt starts from the watermark it left.
    for (let attempt = 0; attempt < 2; attempt++) {
      const card = await this.getWritableCard(userId, cardId);
      const rule = this.findActiveRecurringCharge(card, recurringChargeId);

      const cancelled =
        await this.cardPurchasesRepository.cancelRecurringCharge(
          {
            ...rule,
            creditCardId: card.id,
            categoryId: rule.category?.id ?? null,
          },
          card.cycles,
          today,
        );
      if (cancelled) return null;
    }

    throw new ConflictException('The recurring charge changed; try again.');
  }

  private async getWritableCard(userId: string, cardId: string) {
    const card = await this.validateCardOwnershipService.validate(
      userId,
      cardId,
    );

    if (card.archivedAt) throw new ConflictException(ARCHIVED_CARD_MESSAGE);

    return card;
  }

  private findPurchase(card: CardWithRelations, purchaseId: string) {
    const purchase = card.purchases.find(({ id }) => id === purchaseId);

    if (!purchase) throw new NotFoundException('Purchase not found.');

    return purchase;
  }

  private findActiveRecurringCharge(
    card: CardWithRelations,
    recurringChargeId: string,
  ) {
    const rule = card.recurringCharges.find(
      ({ id }) => id === recurringChargeId,
    );

    if (!rule) throw new NotFoundException('Recurring charge not found.');
    if (rule.cancelledAt) {
      throw new ConflictException('The recurring charge is cancelled.');
    }

    return rule;
  }

  /** The anchor must be the last closed invoice or the open one (R18). */
  private assertValidAnchor(card: CardWithRelations, anchorMonth: number) {
    const openMonth = getInvoiceMonth(card.cycles, getToday());

    if (anchorMonth !== openMonth && anchorMonth !== openMonth - 1) {
      throw new BadRequestException(
        'The current installment must be in the last closed or the open invoice.',
      );
    }
  }

  /**
   * Card entries take one of the user's expense categories other than
   * "Metas" and "Fatura de cartão" (KTD8); refunds may have none.
   */
  private async validateCategory(
    userId: string,
    categoryId: string | undefined,
    isOptional: boolean,
  ) {
    if (!categoryId) {
      if (isOptional) return;
      throw new BadRequestException('A category is required.');
    }

    const category = await this.categoriesRepository.findFirst(
      userId,
      categoryId,
    );
    if (!category) throw new NotFoundException('Category not found.');

    if (
      category.type !== 'EXPENSE' ||
      EXCLUDED_CATEGORY_ICONS.includes(category.icon)
    ) {
      throw new BadRequestException(
        'Card entries take an expense category other than "Metas" and "Fatura de cartão".',
      );
    }
  }

  /** The stored fields and installment rows of a purchase (KTD5). */
  private toPurchase(
    card: CardWithRelations,
    entry: EntryFields & { description: string; categoryId?: string },
    anchorMonth: number | null,
  ): {
    data: PurchaseData;
    installments: { number: number; value: number; invoiceMonth: Date }[];
  } {
    const installmentsCount = entry.installmentsCount ?? 1;
    const purchaseDay = toCalendarDate(new Date(entry.date));

    if (anchorMonth === null) {
      if (entry.currentInstallment !== undefined) {
        throw new BadRequestException(
          'Only a purchase already in progress has a current installment.',
        );
      }
    } else {
      if (
        entry.installmentsCount === undefined ||
        entry.currentInstallment === undefined ||
        entry.currentInstallment > installmentsCount
      ) {
        throw new BadRequestException(
          'A purchase in progress needs a current installment up to the number of installments.',
        );
      }
      if (purchaseDay > getInvoiceDates(card.cycles, anchorMonth).closingDate) {
        throw new BadRequestException(
          'The original purchase date cannot be after the closing of the chosen invoice.',
        );
      }
    }

    // In progress, the value is the installment; the total is N times it.
    const totalValue =
      anchorMonth === null
        ? entry.value
        : fromCents(toCents(entry.value) * installmentsCount);
    const currentInstallment = entry.currentInstallment ?? 1;

    const installments = getInstallments(
      {
        totalValue,
        installmentsCount,
        currentInstallment,
        purchaseDay,
        anchorInvoiceMonth: anchorMonth,
      },
      card.cycles,
    ).map(({ number, value, invoiceMonth }) => ({
      number,
      value,
      invoiceMonth: getMonthStart(invoiceMonth),
    }));

    return {
      data: {
        categoryId: entry.categoryId ?? null,
        description: entry.description,
        totalValue,
        purchaseDate: toNoonUtc(purchaseDay),
        installmentsCount,
        currentInstallment,
      },
      installments,
    };
  }
}
