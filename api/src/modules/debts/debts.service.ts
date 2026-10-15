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
import { BorrowersRepository } from 'src/database/repositories/borrowers.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { isPrismaError } from 'src/database/prisma-errors';
import {
  formatMonthKey,
  getMonthKey,
  getMonthStart,
  fromCents,
  getToday,
  parseMonthKey,
  toCalendarDate,
  toCents,
  toNoonUtc,
} from 'src/shared/calendar';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { DEBT_CATEGORY_ICON } from '../categories/categories.constants';
import { isWithinDateWindow } from '../cards/card-calculations';
import { DATE_OUT_OF_RANGE_MESSAGE } from '../cards/cards.constants';
import { ValidateDebtOwnershipService } from './validate-debt-ownership.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { UpdateExpectedValueDto } from './dto/update-expected-value.dto';
import {
  DebtInstallment,
  InstallmentsPlan,
  getDebtState,
  getNewInstallmentRows,
  getPaymentName,
  getDebtsSummary,
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
const PAYMENT_OUT_OF_RANGE_MESSAGE =
  'The installments must be numbered from 1 to the installments count.';
const NOT_OPEN_PAYMENT_MESSAGE =
  'Some of the installments are no longer open. Reload the debt and choose again.';
const HAS_TRANSACTIONS_MESSAGE =
  'A debt with payments or a loan entry cannot be deleted.';

type RowsPlan = Omit<InstallmentsPlan, 'expectedValue'>;

@Injectable()
export class DebtsService {
  constructor(
    private readonly debtsRepository: DebtsRepository,
    private readonly borrowersRepository: BorrowersRepository,
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

  /** The four values of R2; the rows stay on the server. */
  async getSummary(userId: string) {
    const [debts, borrowers] = await Promise.all([
      this.debtsRepository.findManyByUserId(userId),
      this.borrowersRepository.findManyByUserId(userId),
    ]);

    return getDebtsSummary(debts, borrowers, getToday());
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
          ...this.toInstallmentView(installment),
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
      lastPaymentBankAccountId: this.getLastPaymentBankAccountId(debt),
    };
  }

  /** Debts with an installment in reminder (R21), the nearest due date first. */
  async findReminders(userId: string) {
    const today = getToday();
    const debts = await this.debtsRepository.findOpenByUserId(userId);

    return debts
      .flatMap((debt) => {
        const { installments, reminderNumbers } = getDebtState(debt, today);
        const due = installments.filter(({ number }) =>
          reminderNumbers.includes(number),
        );

        return due.length > 0 ? [{ debt, due }] : [];
      })
      .sort(
        (a, b) =>
          a.due[0].dueDate.getTime() - b.due[0].dueDate.getTime() ||
          a.debt.name.localeCompare(b.debt.name) ||
          a.debt.id.localeCompare(b.debt.id),
      )
      .map(({ debt, due }) => ({
        debtId: debt.id,
        debtName: debt.name,
        dueDate: toNoonUtc(due[0].dueDate),
        expectedValue: fromCents(
          due.reduce(
            (sum, { expectedValue }) => sum + toCents(expectedValue),
            0,
          ),
        ),
        installments: due.map((installment) =>
          this.toInstallmentView(installment),
        ),
        lastPaymentBankAccountId: this.getLastPaymentBankAccountId(debt),
      }));
  }

  /**
   * One expense on the account covers the chosen installments, whatever the
   * value paid (R19, R20). A selection that is no longer open answers 409.
   */
  async pay(
    userId: string,
    debtId: string,
    createDebtPaymentDto: CreateDebtPaymentDto,
  ) {
    const today = getToday();
    const debt = await this.validateDebtOwnershipService.validate(
      userId,
      debtId,
    );
    const { installmentNumbers, bankAccountId, value } = createDebtPaymentDto;
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    );

    if (
      installmentNumbers.some((number) => number > debt.installments.length)
    ) {
      throw new BadRequestException(PAYMENT_OUT_OF_RANGE_MESSAGE);
    }
    const paymentDay = toCalendarDate(new Date(createDebtPaymentDto.date));
    if (!isWithinDateWindow(paymentDay, today)) {
      throw new BadRequestException(DATE_OUT_OF_RANGE_MESSAGE);
    }

    const category = await this.categoriesRepository.findByIcon(
      userId,
      DEBT_CATEGORY_ICON,
      'EXPENSE',
    );
    if (!category) {
      throw new InternalServerErrorException('Debt category not found.');
    }

    const transaction = await this.debtsRepository.pay(
      debtId,
      installmentNumbers,
      {
        userId,
        bankAccountId,
        categoryId: category.id,
        name: getPaymentName(
          debt.name,
          debt.installments,
          installmentNumbers,
          today,
        ),
        value,
        date: toNoonUtc(paymentDay),
        type: 'EXPENSE',
      },
    );
    if (!transaction) throw new ConflictException(NOT_OPEN_PAYMENT_MESSAGE);

    return transaction;
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

  private getLastPaymentBankAccountId(debt: DebtWithRelations) {
    const lastPayment = debt.transactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .pop();

    return lastPayment?.bankAccountId ?? null;
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
      nextInstallment: next ? this.toInstallmentView(next) : null,
    };
  }

  private toInstallmentView(installment: DebtInstallment) {
    return {
      number: installment.number,
      month: formatMonthKey(getMonthKey(installment.dueMonth)),
      dueDate: toNoonUtc(installment.dueDate),
      expectedValue: installment.expectedValue,
    };
  }
}
