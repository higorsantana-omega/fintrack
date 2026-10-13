import {
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CardWithRelations,
  CreditCardsRepository,
} from 'src/database/repositories/credit-cards.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { isPrismaError } from 'src/database/prisma-errors';
import {
  formatMonthKey,
  getMonthKey,
  getMonthStart,
  getToday,
  parseMonthKey,
  toCalendarDate,
  toNoonUtc,
} from 'src/shared/calendar';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { CARD_PAYMENT_CATEGORY_ICON } from '../categories/categories.constants';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import {
  ARCHIVED_CARD_MESSAGE,
  HAS_ENTRIES_MESSAGE,
  MONTH_NAMES,
  PAYMENT_NAME_PREFIX,
} from './cards.constants';
import {
  Forecast,
  Invoice,
  canPayInvoice,
  getCardSeries,
  getCardsSeries,
  getCardsSummary,
  getCategoryTotals,
  getCycleChangeMonth,
  getDefaultInvoiceMonth,
  getFirstCycleMonth,
  getForecasts,
  getInvoiceDates,
  getInvoiceMonth,
  getInvoices,
  getLimit,
  getReminderInvoices,
} from './card-calculations';

@Injectable()
export class CardsService {
  constructor(
    private readonly creditCardsRepository: CreditCardsRepository,
    private readonly cardPurchasesRepository: CardPurchasesRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly validateCardOwnershipService: ValidateCardOwnershipService,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}

  create(userId: string, createCardDto: CreateCardDto) {
    const cycle = {
      closingDay: createCardDto.closingDay,
      dueDay: createCardDto.dueDay,
    };

    return this.creditCardsRepository.create(
      userId,
      this.toCardData(createCardDto),
      {
        ...cycle,
        effectiveFrom: getMonthStart(getFirstCycleMonth(cycle, getToday())),
      },
    );
  }

  async findAllByUserId(userId: string) {
    const today = getToday();
    const cards = await this.loadCards(userId, today);

    return [
      ...cards.filter((card) => !card.archivedAt),
      ...cards.filter((card) => card.archivedAt),
    ].map((card) => this.toCardView(card, today));
  }

  async getSummary(userId: string) {
    const today = getToday();
    const cards = await this.loadCards(userId, today);

    return {
      ...getCardsSummary(cards, today),
      invoicesByMonth: getCardsSeries(cards, today),
    };
  }

  /** Invoices in reminder (R33) of the non-archived cards, by due date. */
  async findReminders(userId: string) {
    const today = getToday();
    const cards = await this.loadCards(userId, today);

    return cards
      .flatMap((card) =>
        getReminderInvoices(card, today).map((invoice) => ({ card, invoice })),
      )
      .sort((a, b) => a.invoice.dueDate.getTime() - b.invoice.dueDate.getTime())
      .map(({ card, invoice }) => ({
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        month: formatMonthKey(invoice.month),
        balance: invoice.balance,
        dueDate: toNoonUtc(invoice.dueDate),
        status: invoice.status,
        lastPaymentBankAccountId: this.getLastPaymentBankAccountId(card),
      }));
  }

  async findOne(userId: string, cardId: string) {
    const today = getToday();
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      today,
    );
    const card = await this.validateCardOwnershipService.validate(
      userId,
      cardId,
    );

    const series = getCardSeries(card, today);
    const toMonth = parseMonthKey(series[series.length - 1].month);
    const invoices = getInvoices(card, today, {
      fromMonth: parseMonthKey(series[0].month),
      toMonth,
    });
    const forecasts = getForecasts(card, today, toMonth);

    return {
      ...this.toCardView(card, today),
      invoices: invoices.map((invoice, index) => ({
        ...this.toInvoiceView(card, invoice, forecasts),
        value: series[index].value,
        isFuture: series[index].isFuture,
      })),
      selectedMonth: formatMonthKey(getDefaultInvoiceMonth(card, today)),
      recurringCharges: card.recurringCharges
        .filter((rule) => !rule.cancelledAt)
        .map((rule) => ({
          id: rule.id,
          description: rule.description,
          value: rule.value,
          category: rule.category,
          firstChargeDate: toNoonUtc(rule.firstChargeDate),
        })),
      lastPaymentBankAccountId: this.getLastPaymentBankAccountId(card),
    };
  }

  async update(userId: string, cardId: string, updateCardDto: UpdateCardDto) {
    const card = await this.validateCardOwnershipService.validate(
      userId,
      cardId,
    );
    this.assertNotArchived(card);

    const latest = card.cycles[card.cycles.length - 1];
    const daysChanged =
      latest.closingDay !== updateCardDto.closingDay ||
      latest.dueDay !== updateCardDto.dueDay;
    const cycle = {
      closingDay: updateCardDto.closingDay,
      dueDay: updateCardDto.dueDay,
    };

    return this.creditCardsRepository.update(
      cardId,
      this.toCardData(updateCardDto),
      daysChanged
        ? {
            ...cycle,
            effectiveFrom: getMonthStart(
              getCycleChangeMonth(card.cycles, cycle, getToday()),
            ),
          }
        : null,
    );
  }

  async remove(userId: string, cardId: string) {
    const card = await this.validateCardOwnershipService.validate(
      userId,
      cardId,
    );

    if (card.purchases.length > 0 || card.payments.length > 0) {
      throw new ConflictException(HAS_ENTRIES_MESSAGE);
    }

    try {
      await this.creditCardsRepository.delete(cardId);
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException(HAS_ENTRIES_MESSAGE);
      }
      throw error;
    }

    return null;
  }

  async archive(userId: string, cardId: string) {
    const today = getToday();
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      today,
    );
    const card = await this.validateCardOwnershipService.validate(
      userId,
      cardId,
    );
    this.assertNotArchived(card);

    const { used } = getLimit(card);
    if (used > 0) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'A card that still owes money cannot be archived.',
        owed: used,
      });
    }

    const archived = await this.creditCardsRepository.archive(cardId, today);
    if (!archived) throw new ConflictException(ARCHIVED_CARD_MESSAGE);

    return null;
  }

  /**
   * Records the payment as an expense on the account, linked to the invoice
   * (KTD7). Open, closed and overdue invoices take payments; on an archived
   * card only while the invoice has a balance (R5).
   */
  async payInvoice(
    userId: string,
    cardId: string,
    month: string,
    createInvoicePaymentDto: CreateInvoicePaymentDto,
  ) {
    const today = getToday();
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      today,
    );
    const card = await this.validateCardOwnershipService.validate(
      userId,
      cardId,
    );
    await this.validateBankAccountOwnershipService.validate(
      userId,
      createInvoicePaymentDto.bankAccountId,
    );

    const monthKey = parseMonthKey(month);
    const [invoice] = getInvoices(card, today, {
      fromMonth: monthKey,
      toMonth: monthKey,
    });
    const takesPayment =
      invoice.status !== 'FUTURE' &&
      invoice.status !== 'PAID' &&
      (!card.archivedAt || invoice.balance > 0);
    if (!takesPayment) {
      throw new ConflictException('This invoice does not take payments.');
    }

    const category = await this.categoriesRepository.findByIcon(
      userId,
      CARD_PAYMENT_CATEGORY_ICON,
      'EXPENSE',
    );
    if (!category) {
      throw new InternalServerErrorException(
        'Card payment category not found.',
      );
    }

    const paymentDay = toCalendarDate(new Date(createInvoicePaymentDto.date));

    return this.transactionsRepository.create({
      userId,
      bankAccountId: createInvoicePaymentDto.bankAccountId,
      categoryId: category.id,
      creditCardId: card.id,
      cardInvoiceMonth: getMonthStart(monthKey),
      name: this.getPaymentName(card.name, monthKey, paymentDay),
      value: createInvoicePaymentDto.value,
      date: toNoonUtc(paymentDay),
      type: 'EXPENSE',
    });
  }

  /** "Fatura <card> <month>", with the year when it is not the payment's. */
  private getPaymentName(cardName: string, monthKey: number, paymentDay: Date) {
    const year = Math.floor(monthKey / 12);
    const monthName = MONTH_NAMES[monthKey % 12];
    const suffix = year === paymentDay.getUTCFullYear() ? '' : `/${year}`;

    return `${PAYMENT_NAME_PREFIX} ${cardName} ${monthName}${suffix}`;
  }

  private getLastPaymentBankAccountId(card: CardWithRelations) {
    const lastPayment = card.payments
      .filter((payment) => payment.type === 'EXPENSE')
      .pop();

    return lastPayment?.bankAccountId ?? null;
  }

  private async loadCards(userId: string, today: Date) {
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      today,
    );

    return this.creditCardsRepository.findManyByUserId(userId);
  }

  private assertNotArchived(card: CardWithRelations) {
    if (card.archivedAt) throw new ConflictException(ARCHIVED_CARD_MESSAGE);
  }

  private toCardData(cardDto: CreateCardDto) {
    return { name: cardDto.name, color: cardDto.color, limit: cardDto.limit };
  }

  private toCardView(card: CardWithRelations, today: Date) {
    const currentMonth = getMonthKey(today);
    const [invoice] = getInvoices(card, today, {
      fromMonth: currentMonth,
      toMonth: currentMonth,
    });
    const latest = card.cycles[card.cycles.length - 1];
    const limit = getLimit(card);
    const openMonth = getInvoiceMonth(card.cycles, today);

    return {
      id: card.id,
      name: card.name,
      color: card.color,
      archivedAt: card.archivedAt,
      createdAt: card.createdAt,
      closingDay: latest.closingDay,
      dueDay: latest.dueDay,
      limit,
      owed: Math.max(0, limit.used),
      currentInvoice: {
        month: formatMonthKey(invoice.month),
        total: invoice.total,
        balance: invoice.balance,
        dueDate: toNoonUtc(invoice.dueDate),
        status: invoice.status,
      },
      // What the entry forms offer: the invoice of the current installment
      // (R18) and the earliest first charge of a recurring one (R19).
      openInvoiceMonth: formatMonthKey(openMonth),
      lastClosedInvoiceMonth: formatMonthKey(openMonth - 1),
      earliestChargeDate: toNoonUtc(
        getInvoiceDates(card.cycles, openMonth - 1).periodStart,
      ),
    };
  }

  private toInvoiceView(
    card: CardWithRelations,
    invoice: Invoice,
    forecasts: Forecast[],
  ) {
    const isInMonth = (date: Date) => getMonthKey(date) === invoice.month;

    const entries = card.purchases.flatMap((purchase) =>
      purchase.installments
        .filter((installment) => isInMonth(installment.invoiceMonth))
        .map((installment) => ({
          id: `${purchase.id}:${installment.number}`,
          purchaseId: purchase.id,
          kind: purchase.kind,
          description: purchase.description,
          date: purchase.purchaseDate,
          category: purchase.category,
          value: installment.value,
          installmentNumber: installment.number,
          installmentsCount: purchase.installmentsCount,
          totalValue: purchase.totalValue,
          currentInstallment: purchase.currentInstallment,
          anchorInvoiceMonth: purchase.anchorInvoiceMonth
            ? formatMonthKey(getMonthKey(purchase.anchorInvoiceMonth))
            : null,
          recurringChargeId: purchase.recurringChargeId,
          isForecast: false,
        })),
    );

    const forecastEntries = forecasts
      .filter((forecast) => forecast.invoiceMonth === invoice.month)
      .map((forecast) => {
        const rule = card.recurringCharges.find(
          ({ id }) => id === forecast.recurringChargeId,
        );

        return {
          id: `${rule.id}:${forecast.date.toISOString()}`,
          purchaseId: null,
          kind: 'PURCHASE' as const,
          description: rule.description,
          date: toNoonUtc(forecast.date),
          category: rule.category,
          value: forecast.value,
          installmentNumber: 1,
          installmentsCount: 1,
          totalValue: forecast.value,
          currentInstallment: 1,
          anchorInvoiceMonth: null,
          recurringChargeId: rule.id,
          isForecast: true,
        };
      });

    const categories = getCategoryTotals(
      entries.map((entry) => ({
        categoryId: entry.category?.id ?? null,
        kind: entry.kind,
        value: entry.value,
      })),
    ).map(({ categoryId, total, share }) => ({
      category:
        entries.find((entry) => entry.category?.id === categoryId)?.category ??
        null,
      total,
      share,
    }));

    return {
      month: formatMonthKey(invoice.month),
      closingDate: toNoonUtc(invoice.closingDate),
      dueDate: toNoonUtc(invoice.dueDate),
      periodStart: toNoonUtc(invoice.periodStart),
      total: invoice.total,
      balance: invoice.balance,
      paid: invoice.paid,
      creditIn: invoice.creditIn,
      creditOut: invoice.creditOut,
      forecast: invoice.forecast,
      status: invoice.status,
      canPay: canPayInvoice(invoice),
      entries: [...entries, ...forecastEntries].sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      ),
      categories,
      payments: card.payments
        .filter(
          (payment) =>
            payment.type === 'EXPENSE' &&
            payment.cardInvoiceMonth &&
            isInMonth(payment.cardInvoiceMonth),
        )
        .map((payment) => ({
          id: payment.id,
          name: payment.name,
          value: payment.value,
          date: payment.date,
          bankAccount: payment.bankAccount,
        })),
    };
  }
}
