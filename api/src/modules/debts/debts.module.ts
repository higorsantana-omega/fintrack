import { Module } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { DebtsController } from './debts.controller';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { ValidateDebtOwnershipService } from './validate-debt-ownership.service';

@Module({
  imports: [BankAccountsModule],
  controllers: [DebtsController],
  providers: [DebtsService, ValidateDebtOwnershipService],
})
export class DebtsModule {}
