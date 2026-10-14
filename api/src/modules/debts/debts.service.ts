import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  DebtWithRelations,
  DebtsRepository,
} from 'src/database/repositories/debts.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { isPrismaError } from 'src/database/prisma-errors';
import {
  formatMonthKey,
  getMonthKey,
  getMonthStart,
  getToday,
  parseMonthKey,
  toNoonUtc,
} from 'src/shared/calendar';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { DEBT_CATEGORY_ICON } from '../categories/categories.constants';
import { isWithinDateWindow } from '../cards/card-calculations';
import { ValidateDebtOwnershipService } from './validate-debt-ownership.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { UpdateExpectedValueDto } from './dto/update-expected-value.dto';
import {
  InstallmentsPlan,
  getDebtState,
  getInstallmentDueDate,
  getNewInstallmentRows,
  getReconciliationPlan,
  hasRegisteredPayment,
} from './debt-calculations';

const ENTRY_NAME_PREFIX = 'Empréstimo';
const INSTALLMENT_OUT_OF_RANGE_MESSAGE =
  'The next installment cannot be greater than the number of installments.';
const MONTH_OUT_OF_RANGE_MESSAGE =
  'The month must be within ten years of today.';
const HAS_PAYMENT_MESSAGE =
  'The installments count, the next installment and its month cannot change once an installment has a payment.';
const NOT_OPEN_MESSAGE = 'The installment is not open.';
const HAS_TRANSACTIONS_MESSAGE =
  'A debt with payments or a loan entry cannot be deleted.';

type RowsPlan = Omit<InstallmentsPlan, 'expectedValue'>;

@Injectable()
export class DebtsService {
  constructor(
    private readonly debtsRepository: DebtsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly validateDebtOwnershipService: ValidateDebtOwnershipService,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}

  async create(userId: string, createDebtDto: CreateDebtDto) {
    const today = getToday();
    const plan = this.toRowsPlan(createDebtDto, today);
    const entry = await this.toEntry(userId, createDebtDto, today);

    return this.debtsRepository.create(
      userId,
      { name: createDebtDto.name, dueDay: createDebtDto.dueDay },
      getNewInstallmentRows({
        ...plan,
        expectedValue: createDebtDto.installmentValue,
      }),
      entry,
    );
  }

  /** Debts still owing first, the paid ones after them. */
  async findAllByUserId(userId: string) {
    const today = getToday();
    const debts = await this.debtsRepository.findManyByUserId(userId);
    const views = debts.map((debt) => this.toDebtView(debt, today));

    return [
      ...views.filter((view) => view.status !== 'PAID'),
      ...views.filter((view) => view.status === 'PAID'),
    ];
  }

  async findOne(userId: string, debtId: string) {
    const today = getToday();
    const debt = await this.validateDebtOwnershipService.validate(
      userId,
      debtId,
    );
    const state = getDebtState(debt, today);
    const plan = this.getCurrentPlan(debt);
    const payments = new Map(
      debt.transactions.map((transaction) => [transaction.id, transaction]),
    );
    const lastPayment = debt.transactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .pop();

    return {
      ...this.toDebtView(debt, today),
      hasPayment: hasRegisteredPayment(debt.installments),
      registration: {
        installmentsCount: plan.installmentsCount,
        nextInstallment: plan.nextInstallment,
        nextInstallmentMonth: formatMonthKey(plan.nextDueMonth),
      },
      installments: state.installments.map((installment) => {
        const payment = payments.get(installment.paymentTransactionId);

        return {
          number: installment.number,
          month: formatMonthKey(getMonthKey(installment.dueMonth)),
          dueDate: toNoonUtc(installment.dueDate),
          expectedValue: installment.expectedValue,
          state: installment.state,
          payment: payment
            ? {
                transactionId: payment.id,
                value: payment.value,
                date: payment.date,
                bankAccount: payment.bankAccount,
              }
            : null,
        };
      }),
      shortcuts: state.shortcuts,
      reminderNumbers: state.reminderNumbers,
      lastPaymentBankAccountId: lastPayment?.bankAccountId ?? null,
    };
  }

  /**
   * Name and due day change any time. The count, the next installment and
   * its month reconcile the rows by number, but only without payments (R12).
   */
  async update(userId: string, debtId: string, updateDebtDto: UpdateDebtDto) {
    const debt = await this.validateDebtOwnershipService.validate(
      userId,
      debtId,
    );
    const data = { name: updateDebtDto.name, dueDay: updateDebtDto.dueDay };
    const current = this.getCurrentPlan(debt);
    const plan: RowsPlan = {
      installmentsCount:
        updateDebtDto.installmentsCount ?? current.installmentsCount,
      nextInstallment: updateDebtDto.nextInstallment ?? current.nextInstallment,
      nextDueMonth: updateDebtDto.nextInstallmentMonth
        ? parseMonthKey(updateDebtDto.nextInstallmentMonth)
        : current.nextDueMonth,
    };
    const changed =
      plan.installmentsCount !== current.installmentsCount ||
      plan.nextInstallment !== current.nextInstallment ||
      plan.nextDueMonth !== current.nextDueMonth;

    if (!changed) return this.debtsRepository.update(debtId, data, null);

    if (hasRegisteredPayment(debt.installments)) {
      throw new ConflictException(HAS_PAYMENT_MESSAGE);
    }
    this.assertPlanIsValid(plan, getToday());

    return this.debtsRepository.update(
      debtId,
      data,
      getReconciliationPlan(debt.installments, plan),
    );
  }

  /** R11: from an open installment to the last, open installments only. */
  async updateExpectedValue(
    userId: string,
    debtId: string,
    updateExpectedValueDto: UpdateExpectedValueDto,
  ) {
    const debt = await this.validateDebtOwnershipService.validate(
      userId,
      debtId,
    );
    const { fromInstallment, value } = updateExpectedValueDto;

    if (!getDebtState(debt, getToday()).openNumbers.includes(fromInstallment)) {
      throw new ConflictException(NOT_OPEN_MESSAGE);
    }

    await this.debtsRepository.updateExpectedValue(
      debtId,
      fromInstallment,
      value,
    );

    return null;
  }

  async remove(userId: string, debtId: string) {
    const debt = await this.validateDebtOwnershipService.validate(
      userId,
      debtId,
    );

    if (debt.transactions.length > 0) {
      throw new ConflictException(HAS_TRANSACTIONS_MESSAGE);
    }

    try {
      await this.debtsRepository.delete(debtId);
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException(HAS_TRANSACTIONS_MESSAGE);
      }
      throw error;
    }

    return null;
  }

  private toRowsPlan(
    plan: Pick<
      CreateDebtDto,
      'installmentsCount' | 'nextInstallment' | 'nextInstallmentMonth'
    >,
    today: Date,
  ): RowsPlan {
    const rowsPlan = {
      installmentsCount: plan.installmentsCount,
      nextInstallment: plan.nextInstallment,
      nextDueMonth: parseMonthKey(plan.nextInstallmentMonth),
    };
    this.assertPlanIsValid(rowsPlan, today);

    return rowsPlan;
  }

  private assertPlanIsValid(plan: RowsPlan, today: Date) {
    if (plan.nextInstallment > plan.installmentsCount) {
      throw new BadRequestException(INSTALLMENT_OUT_OF_RANGE_MESSAGE);
    }
    if (!isWithinDateWindow(getMonthStart(plan.nextDueMonth), today)) {
      throw new BadRequestException(MONTH_OUT_OF_RANGE_MESSAGE);
    }
  }

  /** The loan money that came in (R7), as an income on the account. */
  private async toEntry(
    userId: string,
    createDebtDto: CreateDebtDto,
    today: Date,
  ) {
    if (!createDebtDto.entryBankAccountId) return null;

    await this.validateBankAccountOwnershipService.validate(
      userId,
      createDebtDto.entryBankAccountId,
    );
    const category = await this.categoriesRepository.findByIcon(
      userId,
      DEBT_CATEGORY_ICON,
      'INCOME',
    );
    if (!category) {
      throw new InternalServerErrorException('Debt category not found.');
    }

    return {
      userId,
      bankAccountId: createDebtDto.entryBankAccountId,
      categoryId: category.id,
      name: `${ENTRY_NAME_PREFIX}: ${createDebtDto.name}`,
      value: createDebtDto.entryValue,
      date: toNoonUtc(today),
      type: 'INCOME' as const,
    };
  }

  /** The count, next installment and month the rows were registered with. */
  private getCurrentPlan(debt: DebtWithRelations): RowsPlan {
    const next =
      debt.installments.find(({ paidBeforeApp }) => !paidBeforeApp) ??
      debt.installments[debt.installments.length - 1];

    return {
      installmentsCount: debt.installments.length,
      nextInstallment: next.number,
      nextDueMonth: getMonthKey(next.dueMonth),
    };
  }

  private toDebtView(debt: DebtWithRelations, today: Date) {
    const state = getDebtState(debt, today);
    const next = state.installments.find(
      ({ number }) => number === state.openNumbers[0],
    );

    return {
      id: debt.id,
      name: debt.name,
      dueDay: debt.dueDay,
      createdAt: debt.createdAt,
      installmentsCount: state.installments.length,
      paidCount: state.installments.length - state.openNumbers.length,
      remaining: state.remaining,
      endsIn: state.endsIn,
      status: state.status,
      nextInstallment: next
        ? {
            number: next.number,
            month: formatMonthKey(getMonthKey(next.dueMonth)),
            dueDate: toNoonUtc(
              getInstallmentDueDate(debt.dueDay, next.dueMonth),
            ),
            expectedValue: next.expectedValue,
          }
        : null,
    };
  }
}
