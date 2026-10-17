import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { ValidateBankAccountOwnershipService } from './validate-bank-account-ownership.service';
import { GoalsRepository } from 'src/database/repositories/goals.repositories';
import { CreditCardsRepository } from 'src/database/repositories/credit-cards.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { formatMonthKey, getToday } from 'src/shared/calendar';
import { getReopenedInvoices } from '../cards/card-calculations';
import { DebtsRepository } from 'src/database/repositories/debts.repositories';
import { BorrowersRepository } from 'src/database/repositories/borrowers.repositories';
import { getAccountDeletionImpact } from '../debts/debt-calculations';

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly bankAccountsRepository: BankAccountsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly goalsRepository: GoalsRepository,
    private readonly creditCardsRepository: CreditCardsRepository,
    private readonly cardPurchasesRepository: CardPurchasesRepository,
    private readonly debtsRepository: DebtsRepository,
    private readonly borrowersRepository: BorrowersRepository,
  ) {}

  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountsRepository.create({
      userId,
      name: createBankAccountDto.name,
      initialBalance: createBankAccountDto.initialBalance,
      type: createBankAccountDto.type,
      color: createBankAccountDto.color,
    });
  }

  async findAllByUserId(userId: string) {
    const bankAccounts = await this.bankAccountsRepository.findAllByUserId(
      userId,
    );

    return bankAccounts.map(({ transactions, ...bankAccount }) => {
      const totalTransactions = transactions.reduce((acc, curr) => {
        return acc + (curr.type === 'INCOME' ? curr.value : -curr.value);
      }, 0);

      const currentBalance = bankAccount.initialBalance + totalTransactions;

      return {
        ...bankAccount,
        currentBalance,
      };
    });
  }

  async update(
    userId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    );

    return this.bankAccountsRepository.update(bankAccountId, {
      name: updateBankAccountDto.name,
      initialBalance: updateBankAccountDto.initialBalance,
      type: updateBankAccountDto.type,
      color: updateBankAccountDto.color,
    });
  }

  /**
   * Two steps (KTD9): the goals lock first; then, unless confirmed, the
   * invoices, debt installments and people balances the deletion changes, in a
   * single warning (KTD7).
   */
  async remove(userId: string, bankAccountId: string, confirm = false) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    );

    const linkedGoals =
      await this.goalsRepository.findActiveGoalsLinkedToBankAccount(
        userId,
        bankAccountId,
      );

    if (linkedGoals.length > 0) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'This bank account is linked to goals that are not archived.',
        goals: linkedGoals.map((goal) => goal.name),
      });
    }

    if (!confirm) {
      const [invoices, { debts, borrowers }] = await Promise.all([
        this.getReopenedInvoices(userId, bankAccountId),
        this.getDebtsImpact(userId, bankAccountId),
      ]);

      if (invoices.length + debts.length + borrowers.length > 0) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message:
            'Deleting this bank account changes card invoices, debts or people balances.',
          invoices,
          debts,
          borrowers,
        });
      }
    }

    await this.bankAccountsRepository.delete(bankAccountId);

    return null;
  }

  private async getReopenedInvoices(userId: string, bankAccountId: string) {
    const today = getToday();
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      today,
    );
    const cards = await this.creditCardsRepository.findManyByUserId(userId);
    const isFromAccount = (payment: { bankAccountId: string }) =>
      payment.bankAccountId === bankAccountId;

    return cards.flatMap((card) =>
      getReopenedInvoices(card, today, isFromAccount).map((invoice) => ({
        cardId: card.id,
        cardName: card.name,
        month: formatMonthKey(invoice.month),
        balance: invoice.balance,
      })),
    );
  }

  private async getDebtsImpact(userId: string, bankAccountId: string) {
    const [debts, borrowers] = await Promise.all([
      this.debtsRepository.findManyByUserId(userId),
      this.borrowersRepository.findManyByUserId(userId),
    ]);

    return getAccountDeletionImpact(bankAccountId, debts, borrowers);
  }
}
