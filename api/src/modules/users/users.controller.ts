import { Controller, Get, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import ActiveUserId from 'src/decorators/activeUserId.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  me(@ActiveUserId() userId: string) {
    return this.usersService.getUserById(userId);
  }
}
