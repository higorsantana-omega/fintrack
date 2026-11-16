import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import ActiveUserId from 'src/decorators/activeUserId.decorator';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  me(@ActiveUserId() userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Patch('/me/onboarding')
  updateOnboarding(
    @ActiveUserId() userId: string,
    @Body() { step }: UpdateOnboardingDto,
  ) {
    return this.usersService.updateOnboardingStep(userId, step);
  }

  @Delete('/me/onboarding')
  finishOnboarding(@ActiveUserId() userId: string) {
    return this.usersService.finishOnboarding(userId);
  }
}
