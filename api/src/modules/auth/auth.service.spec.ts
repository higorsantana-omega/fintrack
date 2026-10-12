import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersRepository } from 'src/database/repositories/users.repositories';

describe('AuthService', () => {
  let service: AuthService;
  const usersRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue({ id: 'user-id' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: JwtService, useValue: { signAsync: async () => 'token' } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('creates the default categories, including both "Metas" categories, on signup', async () => {
    await service.signup({
      name: 'Ana',
      email: 'ana@example.com',
      password: '12345678',
    });

    const [{ data }] = usersRepository.create.mock.calls[0];
    expect(data.categories.createMany.data).toEqual([
      { name: 'Salary', icon: 'salary', type: 'INCOME' },
      { name: 'House', icon: 'home', type: 'EXPENSE' },
      { name: 'Metas', icon: 'goal', type: 'EXPENSE' },
      { name: 'Metas', icon: 'goal', type: 'INCOME' },
    ]);
  });
});
