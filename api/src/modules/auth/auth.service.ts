import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticateDto } from './dto/authenticate.dto';
import { UsersRepository } from 'src/database/repositories/users.repositories';
import { compare, hash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import {
  GOAL_CATEGORY_ICON,
  GOAL_CATEGORY_NAME,
} from '../goals/goals.constants';
import {
  CARD_PAYMENT_CATEGORY_ICON,
  CARD_PAYMENT_CATEGORY_NAME,
  DEFAULT_EXPENSE_CATEGORIES,
} from '../categories/categories.constants';

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

    const accessToken = await this.generateAccessToken(user.id);

    return { accessToken };
  }

  async signup(signupDto: SignupDto) {
    const emailTaken = await this.usersRepository.findByEmail(signupDto.email);

    if (emailTaken) throw new ConflictException('This email already in use.');

    const hashedPassword = await hash(signupDto.password, 12);

    const user = await this.usersRepository.create({
      data: {
        name: signupDto.name,
        email: signupDto.email,
        password: hashedPassword,
        categories: {
          createMany: {
            data: [
              { name: 'Salary', icon: 'salary', type: 'INCOME' },
              { name: 'House', icon: 'home', type: 'EXPENSE' },
              {
                name: GOAL_CATEGORY_NAME,
                icon: GOAL_CATEGORY_ICON,
                type: 'EXPENSE',
              },
              {
                name: GOAL_CATEGORY_NAME,
                icon: GOAL_CATEGORY_ICON,
                type: 'INCOME',
              },
              ...DEFAULT_EXPENSE_CATEGORIES.map(({ name, icon }) => ({
                name,
                icon,
                type: 'EXPENSE' as const,
              })),
              {
                name: CARD_PAYMENT_CATEGORY_NAME,
                icon: CARD_PAYMENT_CATEGORY_ICON,
                type: 'EXPENSE',
              },
            ],
          },
        },
      },
    });

    const accessToken = await this.generateAccessToken(user.id);

    return { accessToken };
  }

  private generateAccessToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }
}
