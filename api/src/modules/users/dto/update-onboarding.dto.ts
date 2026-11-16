import { OnboardingStep } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOnboardingDto {
  @IsEnum(OnboardingStep)
  step: OnboardingStep;
}
