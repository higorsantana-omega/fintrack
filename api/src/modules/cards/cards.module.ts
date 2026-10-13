import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { CardEntriesService } from './card-entries.service';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, CardEntriesService, ValidateCardOwnershipService],
})
export class CardsModule {}
