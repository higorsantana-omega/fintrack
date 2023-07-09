import { Injectable } from '@nestjs/common';
import { UsersRepository } from 'src/database/repositories/users.repositories';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserById(userId: string) {
    const user = await this.usersRepository.findById(userId);
    return {
      name: user.name,
      email: user.email,
    };
  }
}
