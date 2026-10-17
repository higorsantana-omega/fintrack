import { Module } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { DebtsController } from './debts.controller';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { ValidateDebtOwnershipService } from './validate-debt-ownership.service';
import { BorrowersController } from './borrowers.controller';
import { BorrowersService } from './borrowers.service';
import { ValidateBorrowerOwnershipService } from './validate-borrower-ownership.service';

@Module({
  imports: [BankAccountsModule],
  controllers: [DebtsController, BorrowersController],
  providers: [
    DebtsService,
    ValidateDebtOwnershipService,
    BorrowersService,
    ValidateBorrowerOwnershipService,
  ],
})
export class DebtsModule {}
