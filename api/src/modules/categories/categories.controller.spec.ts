import { Test } from '@nestjs/testing';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { CreditCardsRepository } from 'src/database/repositories/credit-cards.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ValidateCategoryOwnershipService } from './validate-category-ownership.service';

describe('CategoriesController', () => {
  it("resolves its dependencies and lists the user's categories", async () => {
    const categories = [{ id: 'food', key: 'food', parentId: null }];
    const module = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        CategoriesService,
        ValidateCategoryOwnershipService,
        {
          provide: CategoriesRepository,
          useValue: { findMany: async () => categories },
        },
        { provide: TransactionsRepository, useValue: {} },
        { provide: CreditCardsRepository, useValue: {} },
        { provide: CardPurchasesRepository, useValue: {} },
      ],
    }).compile();

    const controller = module.get(CategoriesController);

    await expect(controller.findAll('ana')).resolves.toEqual(categories);
  });
});
