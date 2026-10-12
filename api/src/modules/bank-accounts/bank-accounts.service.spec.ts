import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BankAccountsService } from './bank-accounts.service';
import { ValidateBankAccountOwnershipService } from './validate-bank-account-ownership.service';
import { BankAccountType } from './entities/BankAccount';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { GoalsRepository } from 'src/database/repositories/goals.repositories';

const ANA = 'ana';

describe('BankAccountsService', () => {
  let service: BankAccountsService;
  let bankAccountsRepository: Record<string, jest.Mock>;
  let linkedGoals: { id: string; name: string }[];
  let findActiveGoalsLinkedToBankAccount: jest.Mock;

  beforeEach(async () => {
    linkedGoals = [];
    bankAccountsRepository = {
      findFirst: jest.fn(async (userId: string, id: string) =>
        userId === ANA ? { id } : null,
      ),
      create: jest.fn(async (data) => data),
      update: jest.fn(async (_, data) => data),
      delete: jest.fn(async () => undefined),
    };
    findActiveGoalsLinkedToBankAccount = jest.fn(async () => linkedGoals);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountsService,
        ValidateBankAccountOwnershipService,
        { provide: BankAccountsRepository, useValue: bankAccountsRepository },
        {
          provide: GoalsRepository,
          useValue: { findActiveGoalsLinkedToBankAccount },
        },
      ],
    }).compile();

    service = module.get<BankAccountsService>(BankAccountsService);
  });

  it('sends only name, initial balance, type and color on update', async () => {
    await service.update(ANA, 'nubank', {
      id: 'nubank',
      userId: 'someone-else',
      user: { connect: { email: 'bia@example.com' } },
      name: 'Nubank',
      initialBalance: 100,
      type: BankAccountType.CHECKING,
      color: '#7950F2',
    } as any);

    expect(bankAccountsRepository.update).toHaveBeenCalledWith('nubank', {
      name: 'Nubank',
      initialBalance: 100,
      type: 'CHECKING',
      color: '#7950F2',
    });
  });

  it('creates an account with named fields only', async () => {
    await service.create(ANA, {
      id: 'forced-id',
      userId: 'someone-else',
      name: 'Nubank',
      initialBalance: 100,
      type: BankAccountType.CHECKING,
      color: '#7950F2',
    } as any);

    expect(bankAccountsRepository.create).toHaveBeenCalledWith({
      userId: ANA,
      name: 'Nubank',
      initialBalance: 100,
      type: 'CHECKING',
      color: '#7950F2',
    });
  });

  it('AE8/AE9: refuses to delete an account linked to a non-archived goal and names the goal', async () => {
    linkedGoals = [{ id: 'goal', name: 'Viagem' }];

    const error = await service.remove(ANA, 'nubank').catch((caught) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({ goals: ['Viagem'] });
    expect(findActiveGoalsLinkedToBankAccount).toHaveBeenCalledWith(
      ANA,
      'nubank',
    );
    expect(bankAccountsRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes an account without non-archived goals linked to it', async () => {
    await service.remove(ANA, 'nubank');

    expect(bankAccountsRepository.delete).toHaveBeenCalledWith('nubank');
  });
});
