import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersRepository } from './repositories/users.repositories';
import { CategoriesRepository } from './repositories/categories.repositories';
import { BankAccountsRepository } from './repositories/bank-accounts.repositories';
import { TransactionsRepository } from './repositories/transactions.repositories';
import { GoalsRepository } from './repositories/goals.repositories';
import { CreditCardsRepository } from './repositories/credit-cards.repositories';
import { CardPurchasesRepository } from './repositories/card-purchases.repositories';
import { RecurringChargesRepository } from './repositories/recurring-charges.repositories';
import { DebtsRepository } from './repositories/debts.repositories';

@Global()
@Module({
  providers: [
    PrismaService,
    UsersRepository,
    CategoriesRepository,
    BankAccountsRepository,
    TransactionsRepository,
    GoalsRepository,
    CreditCardsRepository,
    CardPurchasesRepository,
    RecurringChargesRepository,
    DebtsRepository,
  ],
  exports: [
    UsersRepository,
    CategoriesRepository,
    BankAccountsRepository,
    TransactionsRepository,
    GoalsRepository,
    CreditCardsRepository,
    CardPurchasesRepository,
    RecurringChargesRepository,
    DebtsRepository,
  ],
})
export class DatabaseModule {}
