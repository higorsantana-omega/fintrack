import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { CardPurchasesRepository } from 'src/database/repositories/card-purchases.repositories';
import { CreditCardsRepository } from 'src/database/repositories/credit-cards.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import {
  fromCents,
  getMonthKey,
  getMonthStart,
  getToday,
  parseMonthKey,
  toCents,
  toNoonUtc,
} from 'src/shared/calendar';
import { MAX_DATE_DISTANCE_MONTHS } from '../cards/card-calculations';
import {
  countsInTab,
  getCategoryMonthTotals,
  getMonthCardItems,
} from './categories-calculations';
import { SYSTEM_CATEGORY_KEYS } from './categories.constants';
import { CreateCategoryDto } from './dto/create-category.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ValidateCategoryOwnershipService } from './validate-category-ownership.service';

export const NAME_TAKEN_MESSAGE = 'A category with this name already exists.';
export const FIXED_CATEGORY_MESSAGE =
  'Default and system categories cannot be changed.';
export const INVALID_PARENT_MESSAGE =
  'A subcategory goes inside a group that is not a system category.';
export const SUBCATEGORY_STYLE_MESSAGE =
  'A subcategory takes the icon and color of its group.';
export const DESTINATION_REQUIRED_MESSAGE =
  'Deleting a group requires a destination category.';
export const INVALID_DESTINATION_MESSAGE =
  'The destination must be a category of the same type, outside the deleted group and the system categories.';

export const MONTH_OUT_OF_RANGE_MESSAGE =
  'The month is too far from the current one.';

const normalize = (name: string) => name.trim().toLowerCase();

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly creditCardsRepository: CreditCardsRepository,
    private readonly cardPurchasesRepository: CardPurchasesRepository,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  findAllByUserId(userId: string) {
    return this.categoriesRepository.findMany(userId);
  }

  /**
   * The month's totals and items for the Categories page. Account
   * transactions count by their date and card items by their invoice month,
   * forecasts included (R31 to R35); links and system keys keep card
   * payments, goals and loans out (R9).
   */
  async getSummary(userId: string, month: string, type: TransactionType) {
    const today = getToday();
    const monthKey = parseMonthKey(month);
    if (Math.abs(monthKey - getMonthKey(today)) > MAX_DATE_DISTANCE_MONTHS) {
      throw new BadRequestException(MONTH_OUT_OF_RANGE_MESSAGE);
    }

    // A charge that fell due since the last read is only a purchase after this.
    await this.cardPurchasesRepository.materializeRecurringCharges(
      userId,
      today,
    );
    const [categories, cards, transactions] = await Promise.all([
      this.categoriesRepository.findMany(userId),
      this.creditCardsRepository.findManyByUserId(userId),
      this.transactionsRepository.findManyForSummary(
        userId,
        getMonthStart(monthKey),
        getMonthStart(monthKey + 1),
      ),
    ]);

    const treeIds = new Set(
      categories
        .filter((category) => category.type === type)
        .map(({ id }) => id),
    );
    const inTree = (categoryId: string | null) =>
      treeIds.has(categoryId) ? categoryId : null;

    const accountItems = transactions
      .filter((transaction) =>
        countsInTab(
          { ...transaction, categoryKey: transaction.category?.key ?? null },
          type,
        ),
      )
      .map((transaction) => ({
        id: transaction.id,
        date: transaction.date,
        description: transaction.name,
        cents: toCents(transaction.value),
        categoryId: inTree(transaction.categoryId),
        source: {
          type: 'ACCOUNT' as const,
          id: transaction.bankAccount.id,
          name: transaction.bankAccount.name,
        },
        installmentNumber: null as number | null,
        installmentsCount: null as number | null,
        isForecast: false,
        isRefund: false,
      }));

    // Card entries are expenses only.
    const cardItems =
      type === TransactionType.EXPENSE
        ? getMonthCardItems(cards, today, monthKey).map((item) => ({
            id: item.id,
            date: item.isForecast ? toNoonUtc(item.date) : item.date,
            description: item.description,
            cents: item.cents,
            categoryId: inTree(item.categoryId),
            source: {
              type: 'CARD' as const,
              id: item.cardId,
              name: cards.find(({ id }) => id === item.cardId).name,
            },
            installmentNumber: item.installmentNumber,
            installmentsCount: item.installmentsCount,
            isForecast: item.isForecast,
            isRefund: item.isRefund,
          }))
        : [];

    const items = [...accountItems, ...cardItems];
    const totals = getCategoryMonthTotals(categories, items, type);

    return {
      month,
      type,
      net: fromCents(totals.net),
      categories: totals.categories.map(({ direct, total, ...rest }) => ({
        ...rest,
        direct: fromCents(direct),
        total: fromCents(total),
      })),
      noCategory: {
        total: fromCents(totals.noCategory.total),
        share: totals.noCategory.share,
      },
      items: items
        .sort(
          (a, b) =>
            b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id),
        )
        .map(({ cents, ...item }) => ({ ...item, value: fromCents(cents) })),
    };
  }

  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name.trim();

    if (!createCategoryDto.parentId) {
      await this.assertNameFree(userId, createCategoryDto.type, null, name);

      return this.categoriesRepository.create({
        userId,
        name,
        type: createCategoryDto.type,
        icon: createCategoryDto.icon,
        color: createCategoryDto.color,
      });
    }

    const parent = await this.validateCategoryOwnershipService.validate(
      userId,
      createCategoryDto.parentId,
    );
    if (parent.parentId || this.isSystem(parent)) {
      throw new BadRequestException(INVALID_PARENT_MESSAGE);
    }
    await this.assertNameFree(userId, parent.type, parent.id, name);

    return this.categoriesRepository.create({
      userId,
      name,
      type: parent.type,
      parentId: parent.id,
    });
  }

  async update(
    userId: string,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.getOwnCategory(userId, categoryId);
    const { icon, color } = updateCategoryDto;
    const name = updateCategoryDto.name.trim();

    if (category.parentId && (icon || color)) {
      throw new BadRequestException(SUBCATEGORY_STYLE_MESSAGE);
    }
    await this.assertNameFree(
      userId,
      category.type,
      category.parentId,
      name,
      category.id,
    );

    return this.categoriesRepository.update(categoryId, { name, icon, color });
  }

  async remove(
    userId: string,
    categoryId: string,
    deleteCategoryDto: DeleteCategoryDto,
  ) {
    const category = await this.getOwnCategory(userId, categoryId);

    if (category.parentId) {
      await this.categoriesRepository.moveItemsAndDelete(
        [category.id],
        category.parentId,
      );
      return null;
    }

    const { destinationCategoryId } = deleteCategoryDto;
    if (!destinationCategoryId) {
      throw new BadRequestException(DESTINATION_REQUIRED_MESSAGE);
    }
    const destination = await this.validateCategoryOwnershipService.validate(
      userId,
      destinationCategoryId,
    );
    const all = await this.categoriesRepository.findMany(userId);
    const doomed = [
      category.id,
      ...all
        .filter(({ parentId }) => parentId === category.id)
        .map(({ id }) => id),
    ];
    if (
      destination.type !== category.type ||
      this.isSystem(destination) ||
      doomed.includes(destination.id)
    ) {
      throw new BadRequestException(INVALID_DESTINATION_MESSAGE);
    }

    await this.categoriesRepository.moveItemsAndDelete(doomed, destination.id);
    return null;
  }

  private isSystem(category: { key: string | null }) {
    return !!category.key && SYSTEM_CATEGORY_KEYS.includes(category.key);
  }

  /** Only the user's own categories, the ones without a key, can be changed. */
  private async getOwnCategory(userId: string, categoryId: string) {
    const category = await this.validateCategoryOwnershipService.validate(
      userId,
      categoryId,
    );
    if (category.key) throw new ConflictException(FIXED_CATEGORY_MESSAGE);

    return category;
  }

  /** Names are unique among siblings, ignoring case and edge spaces (R40). */
  private async assertNameFree(
    userId: string,
    type: 'INCOME' | 'EXPENSE',
    parentId: string | null,
    name: string,
    ignoreId?: string,
  ) {
    const siblings = await this.categoriesRepository.findSiblings(
      userId,
      type,
      parentId,
    );

    if (
      siblings.some(
        (sibling) =>
          sibling.id !== ignoreId &&
          normalize(sibling.name) === normalize(name),
      )
    ) {
      throw new ConflictException(NAME_TAKEN_MESSAGE);
    }
  }
}
