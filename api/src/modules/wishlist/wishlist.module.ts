import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ValidateWishlistItemOwnershipService } from './validate-wishlist-item-ownership.service';
import { ValidateWishlistListOwnershipService } from './validate-wishlist-list-ownership.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [CategoriesModule],
  controllers: [WishlistController],
  providers: [
    WishlistService,
    ValidateWishlistListOwnershipService,
    ValidateWishlistItemOwnershipService,
  ],
})
export class WishlistModule {}
