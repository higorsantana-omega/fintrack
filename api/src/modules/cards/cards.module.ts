import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { ValidateCardOwnershipService } from './validate-card-ownership.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, ValidateCardOwnershipService],
})
export class CardsModule {}
