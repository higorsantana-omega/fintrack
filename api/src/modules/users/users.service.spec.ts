import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingStep } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository } from 'src/database/repositories/users.repositories';
import { PrismaService } from 'src/database/prisma.service';

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  onboardingStep: OnboardingStep | null;
};

// In-memory stand-in for the Prisma user delegate. `where` supports plain
// equality and `{ not: value }`, the filters the users repository uses.
function fakePrisma(users: User[]) {
  const matches = (user: User, where: Record<string, unknown>) =>
    Object.entries(where).every(([field, condition]) =>
      condition !== null && typeof condition === 'object' && 'not' in condition
        ? user[field] !== condition.not
        : user[field] === condition,
    );
  const pick = (user: User, select?: Record<string, boolean>) =>
    select
      ? Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]))
      : { ...user };

  return {
    user: {
      findUnique: async ({ where, select }) => {
        const user = users.find((candidate) => matches(candidate, where));
        return user ? pick(user, select) : null;
      },
      updateMany: async ({ where, data }) => {
        const hits = users.filter((candidate) => matches(candidate, where));
        hits.forEach((user) => Object.assign(user, data));
        return { count: hits.length };
      },
    },
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let users: User[];

  const user = (id: string, onboardingStep: OnboardingStep | null): User => ({
    id,
    name: 'Ana',
    email: `${id}@example.com`,
    password: 'hash',
    onboardingStep,
  });
  const stored = (id: string) => users.find((row) => row.id === id);

  beforeEach(async () => {
    users = [user('in-cards', 'CARDS'), user('before-onboarding', null)];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UsersRepository,
        { provide: PrismaService, useValue: fakePrisma(users) },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('returns name, email and onboarding step from me', async () => {
    await expect(service.getUserById('in-cards')).resolves.toEqual({
      name: 'Ana',
      email: 'in-cards@example.com',
      onboardingStep: 'CARDS',
    });
  });

  it('returns a null step for an account created before onboarding existed', async () => {
    const me = await service.getUserById('before-onboarding');
    expect(me.onboardingStep).toBeNull();
  });

  it('moves an active onboarding to the requested step', async () => {
    await expect(
      service.updateOnboardingStep('in-cards', 'GOALS'),
    ).resolves.toEqual({ onboardingStep: 'GOALS' });
    expect(stored('in-cards').onboardingStep).toBe('GOALS');
  });

  it('does not start onboarding for a user without one', async () => {
    await expect(
      service.updateOnboardingStep('before-onboarding', 'GOALS'),
    ).resolves.toEqual({ onboardingStep: null });
    expect(stored('before-onboarding').onboardingStep).toBeNull();
  });

  it('finishes onboarding for good', async () => {
    await expect(service.finishOnboarding('in-cards')).resolves.toEqual({
      onboardingStep: null,
    });
    expect(stored('in-cards').onboardingStep).toBeNull();

    await expect(
      service.updateOnboardingStep('in-cards', 'DEBTS'),
    ).resolves.toEqual({ onboardingStep: null });
    expect(stored('in-cards').onboardingStep).toBeNull();
  });
});
