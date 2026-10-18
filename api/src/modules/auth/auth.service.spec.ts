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

  it('creates the default category tree and the system categories on signup', async () => {
    await service.signup({
      name: 'Ana',
      email: 'ana@example.com',
      password: '12345678',
    });

    const [{ data }] = usersRepository.create.mock.calls[0];
    const rows: {
      id: string;
      parentId?: string;
      key: string;
      type: string;
    }[] = data.categories.createMany.data;
    const groups = (type: string) =>
      rows.filter((row) => row.type === type && !row.parentId);
    const subs = (type: string) =>
      rows.filter((row) => row.type === type && row.parentId);
    const systemKeys = ['card_payment', 'goals', 'debts', 'loans'];

    // 15 default groups plus the expense "debts" system group.
    expect(
      groups('EXPENSE').filter((row) => !systemKeys.includes(row.key)),
    ).toHaveLength(15);
    expect(subs('EXPENSE')).toHaveLength(65);
    expect(
      groups('INCOME').filter((row) => !systemKeys.includes(row.key)),
    ).toHaveLength(3);
    expect(subs('INCOME')).toHaveLength(10);

    expect(
      rows
        .filter((row) => systemKeys.includes(row.key))
        .map(({ key, type }) => `${key}/${type}`)
        .sort(),
    ).toEqual([
      'card_payment/EXPENSE',
      'debts/EXPENSE',
      'debts/INCOME',
      'goals/EXPENSE',
      'goals/INCOME',
      'loans/EXPENSE',
      'loans/INCOME',
    ]);

    // Every row has a key, unique within its type, and each subcategory
    // points at a group of its own type.
    expect(rows.every((row) => row.key)).toBe(true);
    const keys = rows.map((row) => `${row.type}/${row.key}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const sub of rows.filter((row) => row.parentId)) {
      const parent = rows.find((row) => row.id === sub.parentId);
      expect(parent?.type).toBe(sub.type);
      expect(parent?.parentId).toBeUndefined();
    }
  });

  it('gives Food its three subcategories', async () => {
    await service.signup({
      name: 'Ana',
      email: 'ana@example.com',
      password: '12345678',
    });

    const [{ data }] = usersRepository.create.mock.calls[0];
    const rows = data.categories.createMany.data;
    const food = rows.find((row: { key: string }) => row.key === 'food');
    expect(
      rows
        .filter((row: { parentId?: string }) => row.parentId === food.id)
        .map((row: { key: string }) => row.key),
    ).toEqual(['delivery', 'supermarket', 'restaurants']);
  });
});
