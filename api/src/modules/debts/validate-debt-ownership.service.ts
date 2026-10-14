import { Injectable, NotFoundException } from '@nestjs/common';
import { DebtsRepository } from 'src/database/repositories/debts.repositories';

@Injectable()
export class ValidateDebtOwnershipService {
  constructor(private readonly debtsRepository: DebtsRepository) {}

  async validate(userId: string, debtId: string) {
    const debt = await this.debtsRepository.findFirst(userId, debtId);

    if (!debt) throw new NotFoundException('Debt not found.');

    return debt;
  }
}
