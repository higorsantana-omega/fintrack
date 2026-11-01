import { PrismaService } from '../prisma.service';
import { CategoriesRepository } from './categories.repositories';

describe('CategoriesRepository.moveItemsAndDelete', () => {
  function build() {
    const op = (name: string) => jest.fn((args: unknown) => ({ name, args }));
    const prisma = {
      transaction: { updateMany: op('transaction') },
      cardPurchase: { updateMany: op('cardPurchase') },
      recurringCharge: { updateMany: op('recurringCharge') },
      wishlistItem: { updateMany: op('wishlistItem') },
      category: { deleteMany: op('category') },
      $transaction: jest.fn(async (ops: unknown[]) => ops),
    };
    const repository = new CategoriesRepository(
      prisma as unknown as PrismaService,
    );
    return { prisma, repository };
  }

  it('moves wishlist items to the destination in the same transaction that deletes the categories', async () => {
    const { prisma, repository } = build();

    await repository.moveItemsAndDelete(['a', 'b'], 'dest');

    expect(prisma.wishlistItem.updateMany).toHaveBeenCalledWith({
      where: { categoryId: { in: ['a', 'b'] } },
      data: { categoryId: 'dest' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const batched = prisma.$transaction.mock.calls[0][0] as { name: string }[];
    expect(batched.map((o) => o.name)).toEqual([
      'transaction',
      'cardPurchase',
      'recurringCharge',
      'wishlistItem',
      'category',
    ]);
  });
});
