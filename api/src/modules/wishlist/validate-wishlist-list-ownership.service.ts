import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from 'src/database/repositories/wishlist.repositories';

@Injectable()
export class ValidateWishlistListOwnershipService {
  constructor(private readonly wishlistRepository: WishlistRepository) {}

  async validate(userId: string, listId: string) {
    const list = await this.wishlistRepository.findList(userId, listId);

    if (!list) throw new NotFoundException('Wishlist not found.');

    return list;
  }
}
