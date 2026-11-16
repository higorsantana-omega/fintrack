import { Test, TestingModule } from '@nestjs/testing';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';
import { BorrowersRepository } from 'src/database/repositories/borrowers.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { CreditCardsRepository } from 'src/database/repositories/credit-cards.repositories';
import { DebtsRepository } from 'src/database/repositories/debts.repositories';
import { GoalsRepository } from 'src/database/repositories/goals.repositories';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { ValidateBankAccountOwnershipService } from './validate-bank-account-ownership.service';

describe('BankAccountsController', () => {
  let controller: BankAccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankAccountsController],
      providers: [
        BankAccountsService,
        { provide: BankAccountsRepository, useValue: {} },
        { provide: ValidateBankAccountOwnershipService, useValue: {} },
        { provide: GoalsRepository, useValue: {} },
        { provide: CreditCardsRepository, useValue: {} },
        { provide: CardPurchasesRepository, useValue: {} },
        { provide: DebtsRepository, useValue: {} },
        { provide: BorrowersRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<BankAccountsController>(BankAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
