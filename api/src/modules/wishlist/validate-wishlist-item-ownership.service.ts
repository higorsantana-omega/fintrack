import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from 'src/database/repositories/wishlist.repositories';

@Injectable()
export class ValidateWishlistItemOwnershipService {
  constructor(private readonly wishlistRepository: WishlistRepository) {}

  async validate(userId: string, itemId: string) {
    const item = await this.wishlistRepository.findItem(userId, itemId);

    if (!item) throw new NotFoundException('Wishlist item not found.');

    return item;
  }
}
