import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OnboardingStep, Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createDTO: Prisma.UserCreateArgs) {
    return this.prismaService.user.create(createDTO);
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email: email },
    });
  }

  async findById(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
    });
  }

  // Only an active onboarding moves, so a stale tab cannot revive a finished one.
  async updateOnboardingStep(userId: string, step: OnboardingStep | null) {
    const { count } = await this.prismaService.user.updateMany({
      where: { id: userId, onboardingStep: { not: null } },
      data: { onboardingStep: step },
    });
    return { onboardingStep: count > 0 ? step : null };
  }
}
