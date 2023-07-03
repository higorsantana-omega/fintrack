import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticateDto } from './dto/authenticate.dto';
import { UsersRepository } from 'src/database/repositories/users.repositories';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(authenticateDto: AuthenticateDto) {
    const user = await this.usersRepository.findByEmail(authenticateDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const isSamePassword = await compare(
      authenticateDto.password,
      user.password,
    );
    if (!isSamePassword)
      throw new UnauthorizedException('Invalid credentials.');

    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    return { accessToken };
  }
}
