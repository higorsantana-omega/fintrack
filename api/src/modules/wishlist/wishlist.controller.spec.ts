import { Test } from '@nestjs/testing';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { WishlistRepository } from 'src/database/repositories/wishlist.repositories';
import { ValidateCategoryOwnershipService } from '../categories/validate-category-ownership.service';
import { ValidateWishlistItemOwnershipService } from './validate-wishlist-item-ownership.service';
import { ValidateWishlistListOwnershipService } from './validate-wishlist-list-ownership.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

describe('WishlistController', () => {
  it("resolves its dependencies and lists the user's lists", async () => {
    const general = {
      id: 'general',
      name: 'Geral',
      key: 'general',
      userId: 'ana',
    };
    const module = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        WishlistService,
        ValidateWishlistListOwnershipService,
        ValidateWishlistItemOwnershipService,
        ValidateCategoryOwnershipService,
        {
          provide: WishlistRepository,
          useValue: { findListsByUserId: async () => [general] },
        },
        { provide: CategoriesRepository, useValue: {} },
      ],
    }).compile();

    const controller = module.get(WishlistController);

    await expect(controller.findLists('ana')).resolves.toEqual([
      { id: 'general', name: 'Geral', key: 'general' },
    ]);
  });
});
