import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { WishlistRepository } from 'src/database/repositories/wishlist.repositories';
import { getToday } from 'src/shared/calendar';
import { SYSTEM_CATEGORY_KEYS } from '../categories/categories.constants';
import { ValidateCategoryOwnershipService } from '../categories/validate-category-ownership.service';
import { CreateWishlistPriceDto } from './dto/create-wishlist-price.dto';
import { SaveWishlistItemDto } from './dto/save-wishlist-item.dto';
import { SaveWishlistLinkDto } from './dto/save-wishlist-link.dto';
import { SaveWishlistListDto } from './dto/save-wishlist-list.dto';
import { GENERAL_WISHLIST_KEY } from './wishlist.constants';
import {
  toItemView,
  toLinkView,
  toListView,
  toPriceView,
} from './wishlist.mapper';
import {
  PlannedDate,
  getPlannedReminder,
  hasPlannedDateChanged,
  toPlannedDate,
} from './wishlist-calculations';
import { ValidateWishlistItemOwnershipService } from './validate-wishlist-item-ownership.service';
import { ValidateWishlistListOwnershipService } from './validate-wishlist-list-ownership.service';

const GENERAL_DELETE_MESSAGE = 'The general wishlist cannot be deleted.';
const GENERAL_NOT_FOUND_MESSAGE = 'General wishlist not found.';
const DAY_WITHOUT_MONTH_MESSAGE = 'A planned day requires a planned month.';
const CATEGORY_MESSAGE =
  'Wishlist items take an expense category that is not a system category.';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly validateListOwnershipService: ValidateWishlistListOwnershipService,
    private readonly validateItemOwnershipService: ValidateWishlistItemOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  // Lists ----------------------------------------------------------------

  /** Geral first, then the others by name. */
  async findLists(userId: string) {
    const lists = await this.wishlistRepository.findListsByUserId(userId);

    return lists
      .sort(
        (a, b) =>
          Number(b.key === GENERAL_WISHLIST_KEY) -
            Number(a.key === GENERAL_WISHLIST_KEY) ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      )
      .map(toListView);
  }

  async createList(userId: string, saveWishlistListDto: SaveWishlistListDto) {
    return toListView(
      await this.wishlistRepository.createList(
        userId,
        saveWishlistListDto.name.trim(),
      ),
    );
  }

  async updateList(
    userId: string,
    listId: string,
    saveWishlistListDto: SaveWishlistListDto,
  ) {
    await this.validateListOwnershipService.validate(userId, listId);

    return toListView(
      await this.wishlistRepository.updateList(
        listId,
        saveWishlistListDto.name.trim(),
      ),
    );
  }

  /** Moves every item to Geral in one transaction, then deletes (R3). */
  async removeList(userId: string, listId: string) {
    const list = await this.validateListOwnershipService.validate(
      userId,
      listId,
    );

    if (list.key === GENERAL_WISHLIST_KEY) {
      throw new BadRequestException(GENERAL_DELETE_MESSAGE);
    }

    const general = await this.getGeneralList(userId);
    await this.wishlistRepository.deleteListMovingItems(listId, general.id);

    return null;
  }

  // Items ----------------------------------------------------------------

  async findItems(userId: string) {
    const items = await this.wishlistRepository.findItemsByUserId(userId);

    return items.map(toItemView);
  }

  async createItem(userId: string, saveWishlistItemDto: SaveWishlistItemDto) {
    const planned = this.getPlannedDate(saveWishlistItemDto);
    const data = await this.toItemData(userId, saveWishlistItemDto);

    const item = await this.wishlistRepository.createItem(userId, {
      ...data,
      nextReminder: getPlannedReminder(planned, getToday()),
    });

    return toItemView(item);
  }

  /** A full replace; the reminder is recalculated only when the planned date changes (KTD3). */
  async updateItem(
    userId: string,
    itemId: string,
    saveWishlistItemDto: SaveWishlistItemDto,
  ) {
    const item = await this.validateItemOwnershipService.validate(
      userId,
      itemId,
    );
    const planned = this.getPlannedDate(saveWishlistItemDto);
    const data = await this.toItemData(userId, saveWishlistItemDto);
    const before: PlannedDate | null = item.plannedMonth
      ? { plannedMonth: item.plannedMonth, plannedDay: item.plannedDay }
      : null;

    const shouldRecalculate =
      item.status === 'ACTIVE' && hasPlannedDateChanged(before, planned);

    const updated = await this.wishlistRepository.updateItem(itemId, {
      ...data,
      ...(shouldRecalculate && {
        nextReminder: getPlannedReminder(planned, getToday()),
      }),
    });

    return toItemView(updated);
  }

  async removeItem(userId: string, itemId: string) {
    await this.validateItemOwnershipService.validate(userId, itemId);
    await this.wishlistRepository.deleteItem(itemId);

    return null;
  }

  // Links ----------------------------------------------------------------

  async createLink(
    userId: string,
    itemId: string,
    saveWishlistLinkDto: SaveWishlistLinkDto,
  ) {
    await this.validateItemOwnershipService.validate(userId, itemId);

    return toLinkView(
      await this.wishlistRepository.createLink(
        itemId,
        this.toLinkData(saveWishlistLinkDto),
      ),
    );
  }

  async updateLink(
    userId: string,
    linkId: string,
    saveWishlistLinkDto: SaveWishlistLinkDto,
  ) {
    await this.validateLinkOwnership(userId, linkId);

    return toLinkView(
      await this.wishlistRepository.updateLink(
        linkId,
        this.toLinkData(saveWishlistLinkDto),
      ),
    );
  }

  async removeLink(userId: string, linkId: string) {
    await this.validateLinkOwnership(userId, linkId);
    await this.wishlistRepository.deleteLink(linkId);

    return null;
  }

  // Prices ---------------------------------------------------------------

  /** The record takes today in São Paulo (KTD14). */
  async createPrice(
    userId: string,
    linkId: string,
    createWishlistPriceDto: CreateWishlistPriceDto,
  ) {
    await this.validateLinkOwnership(userId, linkId);

    return toPriceView(
      await this.wishlistRepository.createPrice(linkId, {
        value: createWishlistPriceDto.value,
        recordedOn: getToday(),
      }),
    );
  }

  async removePrice(userId: string, priceId: string) {
    const price = await this.wishlistRepository.findPrice(userId, priceId);
    if (!price) throw new NotFoundException('Wishlist price not found.');

    await this.wishlistRepository.deletePrice(priceId);

    return null;
  }

  // Helpers --------------------------------------------------------------

  private async getGeneralList(userId: string) {
    const general = await this.wishlistRepository.findGeneralList(
      userId,
      GENERAL_WISHLIST_KEY,
    );
    if (!general) {
      throw new InternalServerErrorException(GENERAL_NOT_FOUND_MESSAGE);
    }

    return general;
  }

  private async validateLinkOwnership(userId: string, linkId: string) {
    const link = await this.wishlistRepository.findLink(userId, linkId);
    if (!link) throw new NotFoundException('Wishlist link not found.');

    return link;
  }

  private toLinkData({ url, storeName }: SaveWishlistLinkDto) {
    return { url, storeName: storeName.trim() };
  }

  /** A month with an optional day; a day alone is refused (R6). */
  private getPlannedDate({
    plannedMonth,
    plannedDay,
  }: SaveWishlistItemDto): PlannedDate | null {
    if (!plannedMonth) {
      if (plannedDay != null) {
        throw new BadRequestException(DAY_WITHOUT_MONTH_MESSAGE);
      }
      return null;
    }

    return toPlannedDate(plannedMonth, plannedDay);
  }

  /** Validates the list and the category, and maps the body to stored fields. */
  private async toItemData(userId: string, dto: SaveWishlistItemDto) {
    const wishlistId = dto.wishlistId
      ? (
          await this.validateListOwnershipService.validate(
            userId,
            dto.wishlistId,
          )
        ).id
      : (await this.getGeneralList(userId)).id;
    await this.validateCategory(userId, dto.categoryId);
    const planned = this.getPlannedDate(dto);

    return {
      wishlistId,
      categoryId: dto.categoryId ?? null,
      name: dto.name.trim(),
      plannedMonth: planned?.plannedMonth ?? null,
      plannedDay: planned?.plannedDay ?? null,
    };
  }

  /** The user's own expense categories, outside the system ones (KTD9). */
  private async validateCategory(userId: string, categoryId?: string) {
    if (!categoryId) return;

    const category = await this.validateCategoryOwnershipService.validate(
      userId,
      categoryId,
    );

    if (
      category.type !== 'EXPENSE' ||
      (category.key && SYSTEM_CATEGORY_KEYS.includes(category.key))
    ) {
      throw new BadRequestException(CATEGORY_MESSAGE);
    }
  }
}
