import { Injectable } from '@nestjs/common';
import { OnboardingStep } from '@prisma/client';
import { UsersRepository } from 'src/database/repositories/users.repositories';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserById(userId: string) {
    const user = await this.usersRepository.findById(userId);
    return {
      name: user.name,
      email: user.email,
      onboardingStep: user.onboardingStep,
    };
  }

  updateOnboardingStep(userId: string, step: OnboardingStep) {
    return this.usersRepository.updateOnboardingStep(userId, step);
  }

  finishOnboarding(userId: string) {
    return this.usersRepository.updateOnboardingStep(userId, null);
  }
}
