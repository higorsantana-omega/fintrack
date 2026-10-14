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
  DEBT_CATEGORY_ICON,
  DEBT_CATEGORY_NAME,
  DEFAULT_EXPENSE_CATEGORIES,
  LOAN_CATEGORY_ICON,
  LOAN_CATEGORY_NAME,
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
              {
                name: DEBT_CATEGORY_NAME,
                icon: DEBT_CATEGORY_ICON,
                type: 'EXPENSE',
              },
              {
                name: DEBT_CATEGORY_NAME,
                icon: DEBT_CATEGORY_ICON,
                type: 'INCOME',
              },
              {
                name: LOAN_CATEGORY_NAME,
                icon: LOAN_CATEGORY_ICON,
                type: 'EXPENSE',
              },
              {
                name: LOAN_CATEGORY_NAME,
                icon: LOAN_CATEGORY_ICON,
                type: 'INCOME',
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
