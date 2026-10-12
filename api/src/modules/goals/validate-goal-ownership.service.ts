import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalsRepository } from 'src/database/repositories/goals.repositories';

@Injectable()
export class ValidateGoalOwnershipService {
  constructor(private readonly goalsRepository: GoalsRepository) {}

  async validate(userId: string, goalId: string) {
    const goal = await this.goalsRepository.findFirst(userId, goalId);

    if (!goal) throw new NotFoundException('Goal not found.');

    return goal;
  }
}
