import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { CardEntriesService } from './card-entries.service';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';

@Module({
  imports: [BankAccountsModule],
  controllers: [CardsController],
  providers: [CardsService, CardEntriesService, ValidateCardOwnershipService],
})
export class CardsModule {}
