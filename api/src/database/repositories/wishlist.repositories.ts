import { Injectable } from '@nestjs/common';
import { Prisma, WishlistItemStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const linkInclude = Prisma.validator<Prisma.WishlistLinkInclude>()({
  prices: { orderBy: [{ recordedOn: 'asc' }, { createdAt: 'asc' }] },
});

const itemInclude = Prisma.validator<Prisma.WishlistItemInclude>()({
  category: {
    select: { id: true, name: true, key: true, parentId: true, icon: true },
  },
  links: {
    include: linkInclude,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
});

export type WishlistItemWithRelations = Prisma.WishlistItemGetPayload<{
  include: typeof itemInclude;
}>;

const reminderInclude = Prisma.validator<Prisma.WishlistItemInclude>()({
  ...itemInclude,
  wishlist: { select: { name: true } },
});

export type WishlistReminderItem = Prisma.WishlistItemGetPayload<{
  include: typeof reminderInclude;
}>;

export type WishlistLinkWithPrices = Prisma.WishlistLinkGetPayload<{
  include: typeof linkInclude;
}>;

export type WishlistItemData = {
  wishlistId: string;
  categoryId: string | null;
  name: string;
  plannedMonth: Date | null;
  plannedDay: Date | null;
  /** Left as is when omitted. */
  nextReminder?: Date | null;
};

/** The fields an item action writes; the reminder is always set explicitly. */
export type WishlistItemActionData = {
  status?: WishlistItemStatus;
  paidValue?: number;
  paidDate?: Date;
  plannedMonth?: Date;
  plannedDay?: Date | null;
  nextReminder: Date | null;
};

export type WishlistLinkData = { url: string; storeName: string };

export type WishlistPriceData = { value: number; recordedOn: Date };

@Injectable()
export class WishlistRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // Lists ----------------------------------------------------------------

  findListsByUserId(userId: string) {
    return this.prismaService.wishlist.findMany({ where: { userId } });
  }

  findList(userId: string, listId: string) {
    return this.prismaService.wishlist.findFirst({
      where: { userId, id: listId },
    });
  }

  findGeneralList(userId: string, key: string) {
    return this.prismaService.wishlist.findFirst({ where: { userId, key } });
  }

  createList(userId: string, name: string) {
    return this.prismaService.wishlist.create({ data: { userId, name } });
  }

  updateList(listId: string, name: string) {
    return this.prismaService.wishlist.update({
      where: { id: listId },
      data: { name },
    });
  }

  /** Every item of the list goes to Geral, whatever its status (R3). */
  async deleteListMovingItems(listId: string, generalId: string) {
    await this.prismaService.$transaction([
      this.prismaService.wishlistItem.updateMany({
        where: { wishlistId: listId },
        data: { wishlistId: generalId },
      }),
      this.prismaService.wishlist.delete({ where: { id: listId } }),
    ]);
  }

  // Items ----------------------------------------------------------------

  findItemsByUserId(userId: string): Promise<WishlistItemWithRelations[]> {
    return this.prismaService.wishlistItem.findMany({
      where: { userId },
      include: itemInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  /** The active items with their list name; the service picks the due ones. */
  findActiveWithListByUserId(userId: string): Promise<WishlistReminderItem[]> {
    return this.prismaService.wishlistItem.findMany({
      where: { userId, status: 'ACTIVE' },
      include: reminderInclude,
    });
  }

  findItem(userId: string, itemId: string): Promise<WishlistItemWithRelations> {
    return this.prismaService.wishlistItem.findFirst({
      where: { userId, id: itemId },
      include: itemInclude,
    });
  }

  createItem(
    userId: string,
    data: WishlistItemData,
  ): Promise<WishlistItemWithRelations> {
    return this.prismaService.wishlistItem.create({
      data: { userId, ...data },
      include: itemInclude,
    });
  }

  updateItem(
    itemId: string,
    data: WishlistItemData,
  ): Promise<WishlistItemWithRelations> {
    return this.prismaService.wishlistItem.update({
      where: { id: itemId },
      data,
      include: itemInclude,
    });
  }

  /**
   * Writes only while the item is still in the status the action starts from,
   * so two answers never overwrite each other; null when it no longer is.
   */
  async updateItemFromStatus(
    itemId: string,
    from: WishlistItemStatus,
    data: WishlistItemActionData,
  ): Promise<WishlistItemWithRelations | null> {
    const { count } = await this.prismaService.wishlistItem.updateMany({
      where: { id: itemId, status: from },
      data,
    });
    if (count === 0) return null;

    return this.prismaService.wishlistItem.findUnique({
      where: { id: itemId },
      include: itemInclude,
    });
  }

  /** Links and prices cascade; a launch the item generated is untouched. */
  deleteItem(itemId: string) {
    return this.prismaService.wishlistItem.delete({ where: { id: itemId } });
  }

  // Links and prices are owned through their item ------------------------

  findLink(userId: string, linkId: string): Promise<WishlistLinkWithPrices> {
    return this.prismaService.wishlistLink.findFirst({
      where: { id: linkId, item: { userId } },
      include: linkInclude,
    });
  }

  createLink(
    itemId: string,
    data: WishlistLinkData,
  ): Promise<WishlistLinkWithPrices> {
    return this.prismaService.wishlistLink.create({
      data: { itemId, ...data },
      include: linkInclude,
    });
  }

  updateLink(
    linkId: string,
    data: WishlistLinkData,
  ): Promise<WishlistLinkWithPrices> {
    return this.prismaService.wishlistLink.update({
      where: { id: linkId },
      data,
      include: linkInclude,
    });
  }

  deleteLink(linkId: string) {
    return this.prismaService.wishlistLink.delete({ where: { id: linkId } });
  }

  findPrice(userId: string, priceId: string) {
    return this.prismaService.wishlistPrice.findFirst({
      where: { id: priceId, link: { item: { userId } } },
    });
  }

  createPrice(linkId: string, data: WishlistPriceData) {
    return this.prismaService.wishlistPrice.create({
      data: { linkId, ...data },
    });
  }

  deletePrice(priceId: string) {
    return this.prismaService.wishlistPrice.delete({ where: { id: priceId } });
  }
}
