import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { ValidateGoalOwnershipService } from './validate-goal-ownership.service';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';

@Module({
  imports: [BankAccountsModule],
  controllers: [GoalsController],
  providers: [GoalsService, ValidateGoalOwnershipService],
})
export class GoalsModule {}
