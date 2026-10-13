import { Injectable, NotFoundException } from '@nestjs/common';
import { CreditCardsRepository } from 'src/database/repositories/credit-cards.repositories';

@Injectable()
export class ValidateCardOwnershipService {
  constructor(private readonly creditCardsRepository: CreditCardsRepository) {}

  async validate(userId: string, cardId: string) {
    const card = await this.creditCardsRepository.findFirst(userId, cardId);

    if (!card) throw new NotFoundException('Card not found.');

    return card;
  }
}
