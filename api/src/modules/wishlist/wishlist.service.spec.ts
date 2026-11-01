import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { ValidateWishlistListOwnershipService } from './validate-wishlist-list-ownership.service';
import { ValidateWishlistItemOwnershipService } from './validate-wishlist-item-ownership.service';
import {
  WishlistItemWithRelations,
  WishlistRepository,
} from 'src/database/repositories/wishlist.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { ValidateCategoryOwnershipService } from '../categories/validate-category-ownership.service';
import { SaveWishlistListDto } from './dto/save-wishlist-list.dto';
import { SaveWishlistItemDto } from './dto/save-wishlist-item.dto';
import { SaveWishlistLinkDto } from './dto/save-wishlist-link.dto';
import { CreateWishlistPriceDto } from './dto/create-wishlist-price.dto';
import { PostponeWishlistItemDto } from './dto/postpone-wishlist-item.dto';
import { PurchaseWishlistItemDto } from './dto/purchase-wishlist-item.dto';

const ANA = '11111111-1111-1111-1111-111111111111';
const BIA = '22222222-2222-2222-2222-222222222222';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const noon = (value: string) => new Date(`${value}T12:00:00.000Z`);

type Link = WishlistItemWithRelations['links'][number];
type Price = Link['prices'][number];
type List = {
  id: string;
  userId: string;
  name: string;
  key: string | null;
};

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

const categories = [
  { userId: ANA, id: 'ana-food', key: null, type: 'EXPENSE', name: 'Comida' },
  { userId: ANA, id: 'ana-salary', key: null, type: 'INCOME', name: 'Salário' },
  {
    userId: ANA,
    id: 'ana-loans',
    key: 'loans',
    type: 'EXPENSE',
    name: 'Empréstimos',
  },
  { userId: BIA, id: 'bia-food', key: null, type: 'EXPENSE', name: 'Comida' },
].map((category) => ({
  parentId: null,
  icon: null,
  color: null,
  ...category,
}));

describe('WishlistService', () => {
  let service: WishlistService;
  let lists: List[];
  let items: WishlistItemWithRelations[];

  const general = (userId: string) =>
    lists.find((list) => list.userId === userId && list.key === 'general');

  const makeItem = (
    userId: string,
    overrides: Partial<WishlistItemWithRelations> = {},
  ) => {
    const item = {
      id: nextId('item'),
      userId,
      wishlistId: general(userId).id,
      categoryId: null,
      name: 'Fone',
      plannedMonth: null,
      plannedDay: null,
      nextReminder: day('2026-11-12'),
      status: 'ACTIVE',
      paidValue: null,
      paidDate: null,
      createdAt: new Date('2026-10-01T15:00:00.000Z'),
      category: null,
      links: [],
      ...overrides,
    } as WishlistItemWithRelations;
    items.push(item);
    return item;
  };

  const makeList = (userId: string, name: string) => {
    const list = { id: nextId('list'), userId, name, key: null };
    lists.push(list);
    return list;
  };

  const makeLink = (item: WishlistItemWithRelations, storeName = 'Loja') => {
    const link: Link = {
      id: nextId('link'),
      itemId: item.id,
      url: 'https://loja.com/produto',
      storeName,
      createdAt: new Date(`2026-10-01T15:00:0${(counter % 9) + 1}.000Z`),
      prices: [],
    };
    item.links.push(link);
    return link;
  };

  const makePrice = (
    link: Link,
    value: number,
    recordedOn: string,
    createdAt = '2026-10-01T15:00:00.000Z',
  ) => {
    const price: Price = {
      id: nextId('price'),
      linkId: link.id,
      value,
      recordedOn: day(recordedOn),
      createdAt: new Date(createdAt),
    };
    link.prices.push(price);
    return price;
  };

  const findLinkOf = (linkId: string, userId?: string) => {
    for (const item of items) {
      const link = item.links.find((candidate) => candidate.id === linkId);
      if (link && (!userId || item.userId === userId)) return link;
    }
    return null;
  };

  const itemById = (itemId: string) => items.find(({ id }) => id === itemId);

  beforeEach(async () => {
    lists = [];
    items = [];
    for (const userId of [ANA, BIA]) {
      lists.push({
        id: `${userId}-general`,
        userId,
        name: 'Geral',
        key: 'general',
      });
    }

    const withCategory = (item: WishlistItemWithRelations) => {
      const category = categories.find(({ id }) => id === item.categoryId);
      item.category = category
        ? {
            id: category.id,
            name: category.name,
            key: category.key,
            parentId: category.parentId,
            icon: category.icon,
          }
        : null;
      return item;
    };

    // Stands in for the database: writes change what the reads return.
    const wishlistRepository = {
      findListsByUserId: async (userId: string) =>
        lists.filter((list) => list.userId === userId),
      findList: async (userId: string, listId: string) =>
        lists.find((list) => list.userId === userId && list.id === listId) ??
        null,
      findGeneralList: async (userId: string) => general(userId) ?? null,
      createList: async (userId: string, name: string) =>
        makeList(userId, name),
      updateList: async (listId: string, name: string) =>
        Object.assign(
          lists.find(({ id }) => id === listId),
          { name },
        ),
      deleteListMovingItems: async (listId: string, generalId: string) => {
        items
          .filter((item) => item.wishlistId === listId)
          .forEach((item) => (item.wishlistId = generalId));
        lists = lists.filter(({ id }) => id !== listId);
      },
      findItemsByUserId: async (userId: string) =>
        items.filter((item) => item.userId === userId).map(withCategory),
      findActiveWithListByUserId: async (userId: string) =>
        items
          .filter((item) => item.userId === userId && item.status === 'ACTIVE')
          .map(withCategory)
          .map((item) => ({
            ...item,
            wishlist: {
              name: lists.find(({ id }) => id === item.wishlistId).name,
            },
          })),
      updateItemFromStatus: async (
        itemId: string,
        from: string,
        data: object,
      ) => {
        const item = itemById(itemId);
        return item.status === from
          ? withCategory(Object.assign(item, data))
          : null;
      },
      findItem: async (userId: string, itemId: string) => {
        const item = items.find(
          (candidate) => candidate.userId === userId && candidate.id === itemId,
        );
        return item ? withCategory(item) : null;
      },
      createItem: async (
        userId: string,
        data: Partial<WishlistItemWithRelations>,
      ) => withCategory(makeItem(userId, data)),
      updateItem: async (itemId: string, data: object) =>
        withCategory(Object.assign(itemById(itemId), data)),
      deleteItem: async (itemId: string) => {
        items = items.filter(({ id }) => id !== itemId);
      },
      findLink: async (userId: string, linkId: string) =>
        findLinkOf(linkId, userId),
      createLink: async (itemId: string, data: object) => {
        const link = makeLink(itemById(itemId));
        return Object.assign(link, data);
      },
      updateLink: async (linkId: string, data: object) =>
        Object.assign(findLinkOf(linkId), data),
      deleteLink: async (linkId: string) => {
        items.forEach((item) => {
          item.links = item.links.filter(({ id }) => id !== linkId);
        });
      },
      findPrice: async (userId: string, priceId: string) => {
        for (const item of items) {
          if (item.userId !== userId) continue;
          for (const link of item.links) {
            const price = link.prices.find(({ id }) => id === priceId);
            if (price) return price;
          }
        }
        return null;
      },
      createPrice: async (
        linkId: string,
        data: { value: number; recordedOn: Date },
      ) => {
        return makePrice(
          findLinkOf(linkId),
          data.value,
          data.recordedOn.toISOString().slice(0, 10),
          new Date().toISOString(),
        );
      },
      deletePrice: async (priceId: string) => {
        items.forEach((item) =>
          item.links.forEach((link) => {
            link.prices = link.prices.filter(({ id }) => id !== priceId);
          }),
        );
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        ValidateWishlistListOwnershipService,
        ValidateWishlistItemOwnershipService,
        ValidateCategoryOwnershipService,
        { provide: WishlistRepository, useValue: wishlistRepository },
        {
          provide: CategoriesRepository,
          useValue: {
            findFirst: async (userId: string, categoryId: string) =>
              categories.find(
                (category) =>
                  category.userId === userId && category.id === categoryId,
              ) ?? null,
          },
        },
      ],
    }).compile();

    service = module.get(WishlistService);
    jest.useFakeTimers({
      now: new Date('2026-10-13T15:00:00.000Z'),
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const itemBody = (overrides = {}) => ({ name: 'Fone', ...overrides });

  describe('lists', () => {
    it('lists Geral first and then the other lists by name', async () => {
      makeList(ANA, 'Natal');
      makeList(ANA, 'Casa nova');
      makeList(BIA, 'Da Bia');

      const result = await service.findLists(ANA);

      expect(result.map(({ name }) => name)).toEqual([
        'Geral',
        'Casa nova',
        'Natal',
      ]);
      expect(result[0]).toEqual({
        id: `${ANA}-general`,
        name: 'Geral',
        key: 'general',
      });
    });

    it('creates and renames a list', async () => {
      const created = await service.createList(ANA, { name: 'Natal' });
      expect(created).toEqual({ id: created.id, name: 'Natal', key: null });

      const renamed = await service.updateList(ANA, created.id, {
        name: 'Presentes',
      });
      expect(renamed.name).toBe('Presentes');
    });

    it('accepts renaming Geral and keeps its key', async () => {
      const renamed = await service.updateList(ANA, `${ANA}-general`, {
        name: 'Tudo',
      });

      expect(renamed).toEqual({
        id: `${ANA}-general`,
        name: 'Tudo',
        key: 'general',
      });
    });

    it('refuses to delete Geral', async () => {
      await expect(
        service.removeList(ANA, `${ANA}-general`),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(general(ANA)).toBeDefined();
    });

    it('Covers AE11. deletes "Natal" and moves its two active items and its purchased one to Geral, each in the same state', async () => {
      const natal = makeList(ANA, 'Natal');
      const first = makeItem(ANA, { wishlistId: natal.id, name: 'Bola' });
      const second = makeItem(ANA, { wishlistId: natal.id, name: 'Pipa' });
      const bought = makeItem(ANA, {
        wishlistId: natal.id,
        name: 'Boneca',
        status: 'PURCHASED',
        paidValue: 80,
        paidDate: day('2026-10-02'),
        nextReminder: null,
      });

      await expect(service.removeList(ANA, natal.id)).resolves.toBeNull();

      expect(lists.find(({ id }) => id === natal.id)).toBeUndefined();
      const result = await service.findItems(ANA);
      expect(result.map((item) => item.wishlistId)).toEqual([
        `${ANA}-general`,
        `${ANA}-general`,
        `${ANA}-general`,
      ]);
      expect(
        [first, second, bought].map(({ id }) => {
          const item = result.find((candidate) => candidate.id === id);
          return [item.status, item.paidValue];
        }),
      ).toEqual([
        ['ACTIVE', null],
        ['ACTIVE', null],
        ['PURCHASED', 80],
      ]);
    });

    it("answers 404 on another user's list", async () => {
      const others = makeList(BIA, 'Da Bia');

      await expect(
        service.updateList(ANA, others.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.removeList(ANA, others.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.createItem(ANA, itemBody({ wishlistId: others.id })),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(lists).toContain(others);
    });
  });

  describe('items', () => {
    it('puts an item created without a list in Geral (R2)', async () => {
      const created = await service.createItem(ANA, itemBody());

      expect(created.wishlistId).toBe(`${ANA}-general`);
      expect(created.status).toBe('ACTIVE');
      expect(created.links).toEqual([]);
      expect(created.lowestPrice).toBeNull();
    });

    it('creates an item in the chosen list with a category and a planned date', async () => {
      const natal = makeList(ANA, 'Natal');

      const created = await service.createItem(
        ANA,
        itemBody({
          wishlistId: natal.id,
          categoryId: 'ana-food',
          plannedMonth: '2026-12',
          plannedDay: 25,
        }),
      );

      expect(created).toMatchObject({
        wishlistId: natal.id,
        category: {
          id: 'ana-food',
          name: 'Comida',
          key: null,
          parentId: null,
          icon: null,
        },
        plannedMonth: '2026-12',
        plannedDay: 25,
        nextReminder: noon('2026-12-25'),
      });
    });

    it('moves a day past the end of a short month to its last day', async () => {
      const created = await service.createItem(
        ANA,
        itemBody({ plannedMonth: '2027-02', plannedDay: 31 }),
      );

      expect(created.plannedDay).toBe(28);
      expect(created.nextReminder).toEqual(noon('2027-02-28'));
    });

    it('sets the first day of the planned month as the reminder when there is no day', async () => {
      const created = await service.createItem(
        ANA,
        itemBody({ plannedMonth: '2026-12' }),
      );

      expect(created.plannedMonth).toBe('2026-12');
      expect(created.plannedDay).toBeNull();
      expect(created.nextReminder).toEqual(noon('2026-12-01'));
    });

    it('sets the reminder 30 days from today without a planned date', async () => {
      const created = await service.createItem(ANA, itemBody());

      expect(created.plannedMonth).toBeNull();
      expect(created.nextReminder).toEqual(noon('2026-11-12'));
    });

    it('refuses a day without a month with 400', async () => {
      await expect(
        service.createItem(ANA, itemBody({ plannedDay: 10 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(items).toHaveLength(0);
    });

    it.each([
      ['an income category', 'ana-salary'],
      ['a system category', 'ana-loans'],
    ])('refuses %s with 400', async (_, categoryId) => {
      await expect(
        service.createItem(ANA, itemBody({ categoryId })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(items).toHaveLength(0);
    });

    it("refuses another user's category with 404", async () => {
      await expect(
        service.createItem(ANA, itemBody({ categoryId: 'bia-food' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a bad category on update too', async () => {
      const item = makeItem(ANA);

      await expect(
        service.updateItem(
          ANA,
          item.id,
          itemBody({ categoryId: 'ana-salary' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces the item on update: moves the list and clears omitted fields', async () => {
      const natal = makeList(ANA, 'Natal');
      const item = makeItem(ANA, {
        wishlistId: natal.id,
        categoryId: 'ana-food',
      });

      const updated = await service.updateItem(
        ANA,
        item.id,
        itemBody({ name: 'Fone bom' }),
      );

      expect(updated).toMatchObject({
        name: 'Fone bom',
        wishlistId: `${ANA}-general`,
        category: null,
      });
    });

    it('keeps the postponed reminder when only the name changes', async () => {
      const item = makeItem(ANA, {
        plannedMonth: day('2026-12-01'),
        plannedDay: day('2026-12-25'),
        nextReminder: day('2027-01-10'),
      });

      const updated = await service.updateItem(
        ANA,
        item.id,
        itemBody({
          name: 'Fone novo',
          plannedMonth: '2026-12',
          plannedDay: 25,
        }),
      );

      expect(updated.name).toBe('Fone novo');
      expect(updated.nextReminder).toEqual(noon('2027-01-10'));
    });

    it('recalculates the reminder when the planned month changes', async () => {
      const item = makeItem(ANA, {
        plannedMonth: day('2026-12-01'),
        plannedDay: null,
        nextReminder: day('2026-12-01'),
      });

      const updated = await service.updateItem(
        ANA,
        item.id,
        itemBody({ plannedMonth: '2027-03' }),
      );

      expect(updated.plannedMonth).toBe('2027-03');
      expect(updated.nextReminder).toEqual(noon('2027-03-01'));
    });

    it('recalculates when the planned date is removed', async () => {
      const item = makeItem(ANA, {
        plannedMonth: day('2026-12-01'),
        nextReminder: day('2026-12-01'),
      });

      const updated = await service.updateItem(ANA, item.id, itemBody());

      expect(updated.plannedMonth).toBeNull();
      expect(updated.nextReminder).toEqual(noon('2026-11-12'));
    });

    it('does not set a reminder on a purchased item whose date changes', async () => {
      const item = makeItem(ANA, {
        status: 'PURCHASED',
        nextReminder: null,
        paidValue: 50,
        paidDate: day('2026-10-02'),
      });

      const updated = await service.updateItem(
        ANA,
        item.id,
        itemBody({ plannedMonth: '2027-03' }),
      );

      expect(updated.nextReminder).toBeNull();
      expect(updated.status).toBe('PURCHASED');
      expect(updated.paidValue).toBe(50);
    });

    it('removes an item with its links and prices', async () => {
      const item = makeItem(ANA);
      const link = makeLink(item);
      const price = makePrice(link, 100, '2026-10-01');

      await expect(service.removeItem(ANA, item.id)).resolves.toBeNull();

      expect(items).toHaveLength(0);
      await expect(service.removePrice(ANA, price.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("never reads, edits or removes another user's item", async () => {
      const others = makeItem(BIA);

      expect(await service.findItems(ANA)).toEqual([]);
      await expect(
        service.updateItem(ANA, others.id, itemBody()),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.removeItem(ANA, others.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.createLink(ANA, others.id, {
          url: 'https://loja.com/x',
          storeName: 'loja.com',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(items).toEqual([others]);
    });

    it('lists the lowest price, store, date and variation per link', async () => {
      const item = makeItem(ANA);
      const cara = makeLink(item, 'Cara');
      const barata = makeLink(item, 'Barata');
      makePrice(cara, 120, '2026-09-01');
      makePrice(cara, 100, '2026-10-01');
      makePrice(barata, 90, '2026-10-05');
      makeLink(item, 'Sem preço');

      const [view] = await service.findItems(ANA);

      expect(view.lowestPrice).toEqual({
        value: 90,
        storeName: 'Barata',
        recordedOn: noon('2026-10-05'),
      });
      expect(view.links).toHaveLength(3);
      expect(view.links[0]).toMatchObject({
        storeName: 'Cara',
        currentPrice: 100,
        currentRecordedOn: noon('2026-10-01'),
        variation: -20,
      });
      expect(view.links[0].prices.map(({ value }) => value)).toEqual([
        120, 100,
      ]);
      expect(view.links[1]).toMatchObject({
        currentPrice: 90,
        variation: null,
      });
      expect(view.links[2]).toMatchObject({
        currentPrice: null,
        currentRecordedOn: null,
        variation: null,
        prices: [],
      });
    });
  });

  describe('reminders and item actions', () => {
    const TODAY = day('2026-10-13');

    it('lists only active items whose reminder has arrived, by date, creation and id (R29)', async () => {
      const later = makeItem(ANA, {
        name: 'B',
        nextReminder: day('2026-10-13'),
        createdAt: new Date('2026-10-02T15:00:00.000Z'),
      });
      const older = makeItem(ANA, {
        name: 'A',
        nextReminder: day('2026-10-05'),
      });
      const sameDayEarlier = makeItem(ANA, {
        name: 'C',
        nextReminder: day('2026-10-13'),
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
      });
      makeItem(ANA, { nextReminder: day('2026-10-14') });
      makeItem(ANA, { status: 'PURCHASED', nextReminder: null });
      makeItem(ANA, { status: 'GAVE_UP', nextReminder: null });
      makeItem(BIA, { nextReminder: day('2026-10-01') });
      const natal = makeList(ANA, 'Natal');
      later.wishlistId = natal.id;

      const reminders = await service.findReminders(ANA);

      expect(reminders.map(({ id }) => id)).toEqual([
        older.id,
        sameDayEarlier.id,
        later.id,
      ]);
      expect(reminders.map(({ wishlistName }) => wishlistName)).toEqual([
        'Geral',
        'Geral',
        'Natal',
      ]);
      expect(reminders[0]).toMatchObject({
        status: 'ACTIVE',
        nextReminder: noon('2026-10-05'),
        links: [],
        lowestPrice: null,
      });
    });

    describe('purchase', () => {
      const body = (overrides = {}) => ({
        paidValue: 499,
        paidDate: '2026-10-13T15:00:00.000Z',
        ...overrides,
      });

      it('stores the value and the day, and stops the reminder', async () => {
        const item = makeItem(ANA);

        const result = await service.purchase(ANA, item.id, body());

        expect(result).toMatchObject({
          status: 'PURCHASED',
          paidValue: 499,
          paidDate: noon('2026-10-13'),
          nextReminder: null,
        });
        expect(itemById(item.id)).toMatchObject({
          status: 'PURCHASED',
          paidValue: 499,
          paidDate: TODAY,
          nextReminder: null,
        });
      });

      it('keeps an instant at 23:00 in Brasília on the same São Paulo day', async () => {
        const item = makeItem(ANA);

        await service.purchase(
          ANA,
          item.id,
          body({ paidDate: '2026-10-14T02:00:00.000Z' }),
        );

        expect(itemById(item.id).paidDate).toEqual(TODAY);
      });

      it('answers 409 for an item already purchased and keeps the paid value', async () => {
        const item = makeItem(ANA);
        await service.purchase(ANA, item.id, body());

        await expect(
          service.purchase(ANA, item.id, body({ paidValue: 1 })),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(itemById(item.id).paidValue).toBe(499);
      });

      it('answers 409 when the item changes state during the purchase', async () => {
        const item = makeItem(ANA);
        const repository = (service as any).wishlistRepository;
        const update = repository.updateItemFromStatus;
        repository.updateItemFromStatus = async (...args: unknown[]) => {
          itemById(item.id).status = 'GAVE_UP';
          return update(...args);
        };

        await expect(
          service.purchase(ANA, item.id, body()),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(itemById(item.id).paidValue).toBeNull();
      });

      it('answers 400 for a date outside the allowed window', async () => {
        const item = makeItem(ANA);

        await expect(
          service.purchase(
            ANA,
            item.id,
            body({ paidDate: '2060-01-01T12:00:00.000Z' }),
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(itemById(item.id).status).toBe('ACTIVE');
      });

      it('answers 404 for an item of another user', async () => {
        const item = makeItem(BIA);

        await expect(
          service.purchase(ANA, item.id, body()),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('does not depend on any transaction (AE10)', async () => {
        const item = makeItem(ANA);

        await service.purchase(ANA, item.id, body());

        // The repository fake has no transaction access: the item keeps what
        // was paid with no link to the expense that may be deleted later.
        expect(itemById(item.id)).toMatchObject({
          status: 'PURCHASED',
          paidValue: 499,
        });
        expect(Object.keys(itemById(item.id))).not.toContain('transactionId');
      });
    });

    describe('give-up', () => {
      it('gives up an active item and stops its reminder, keeping links and prices (R26)', async () => {
        const item = makeItem(ANA);
        const link = makeLink(item);
        makePrice(link, 10, '2026-10-01');

        const result = await service.giveUp(ANA, item.id);

        expect(result).toMatchObject({ status: 'GAVE_UP', nextReminder: null });
        expect(result.links[0].prices).toHaveLength(1);
      });

      it.each(['GAVE_UP', 'PURCHASED'])(
        'answers 409 for a %s item',
        async (status) => {
          const item = makeItem(ANA, { status, nextReminder: null } as never);

          await expect(service.giveUp(ANA, item.id)).rejects.toBeInstanceOf(
            ConflictException,
          );
        },
      );
    });

    describe('reactivate', () => {
      it('reactivates with the reminder tomorrow when the planned month is past (AE12)', async () => {
        const item = makeItem(ANA, {
          status: 'GAVE_UP',
          nextReminder: null,
          plannedMonth: day('2026-09-01'),
        });

        const result = await service.reactivate(ANA, item.id);

        expect(result).toMatchObject({
          status: 'ACTIVE',
          plannedMonth: '2026-09',
          nextReminder: noon('2026-10-14'),
        });
      });

      it('reactivates an item with a future planned day at that day', async () => {
        const item = makeItem(ANA, {
          status: 'GAVE_UP',
          nextReminder: null,
          plannedMonth: day('2026-12-01'),
          plannedDay: day('2026-12-25'),
        });

        const result = await service.reactivate(ANA, item.id);

        expect(result.nextReminder).toEqual(noon('2026-12-25'));
      });

      it('reactivates an item without a planned date 30 days ahead', async () => {
        const item = makeItem(ANA, { status: 'GAVE_UP', nextReminder: null });

        const result = await service.reactivate(ANA, item.id);

        expect(result.nextReminder).toEqual(noon('2026-11-12'));
      });

      it.each(['ACTIVE', 'PURCHASED'])(
        'answers 409 for a %s item',
        async (status) => {
          const item = makeItem(ANA, { status } as never);

          await expect(service.reactivate(ANA, item.id)).rejects.toBeInstanceOf(
            ConflictException,
          );
        },
      );
    });

    describe('keep', () => {
      it('moves an item without a date 30 days after the answer (AE3)', async () => {
        const item = makeItem(ANA, { nextReminder: day('2026-10-13') });

        const result = await service.keep(ANA, item.id);

        expect(result.nextReminder).toEqual(noon('2026-11-12'));
        expect(result.status).toBe('ACTIVE');
      });

      it('answers 400 for an item with a planned date', async () => {
        const item = makeItem(ANA, { plannedMonth: day('2026-11-01') });

        await expect(service.keep(ANA, item.id)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(itemById(item.id).nextReminder).toEqual(day('2026-11-12'));
      });

      it('answers 409 for an item that is not active', async () => {
        const item = makeItem(ANA, {
          status: 'GAVE_UP',
          nextReminder: null,
        } as never);

        await expect(service.keep(ANA, item.id)).rejects.toBeInstanceOf(
          ConflictException,
        );
      });
    });

    describe('postpone', () => {
      it('moves the planned month to December and the reminder to 01/12 (AE5)', async () => {
        const item = makeItem(ANA, {
          plannedMonth: day('2026-11-01'),
          nextReminder: day('2026-11-01'),
        });

        const result = await service.postpone(ANA, item.id, {
          plannedMonth: '2026-12',
        });

        expect(result).toMatchObject({
          plannedMonth: '2026-12',
          plannedDay: null,
          nextReminder: noon('2026-12-01'),
        });
      });

      it('stores the day clamped to the month and reminds on it', async () => {
        const item = makeItem(ANA);

        const result = await service.postpone(ANA, item.id, {
          plannedMonth: '2027-02',
          plannedDay: 31,
        });

        expect(result).toMatchObject({
          plannedMonth: '2027-02',
          plannedDay: 28,
          nextReminder: noon('2027-02-28'),
        });
      });

      it('answers 409 for an item that is not active', async () => {
        const item = makeItem(ANA, {
          status: 'PURCHASED',
          nextReminder: null,
        } as never);

        await expect(
          service.postpone(ANA, item.id, { plannedMonth: '2026-12' }),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });
  });

  describe('links', () => {
    it('creates, edits and removes a link of the own item', async () => {
      const item = makeItem(ANA);

      const created = await service.createLink(ANA, item.id, {
        url: 'https://www.loja.com/produto',
        storeName: 'Loja',
      });
      expect(created).toMatchObject({
        url: 'https://www.loja.com/produto',
        storeName: 'Loja',
        currentPrice: null,
        variation: null,
        prices: [],
      });

      const edited = await service.updateLink(ANA, created.id, {
        url: 'https://outra.com/p',
        storeName: 'Outra',
      });
      expect(edited).toMatchObject({
        url: 'https://outra.com/p',
        storeName: 'Outra',
      });

      await expect(service.removeLink(ANA, created.id)).resolves.toBeNull();
      expect(item.links).toEqual([]);
    });

    it("answers 404 on another user's link", async () => {
      const others = makeLink(makeItem(BIA));

      await expect(
        service.updateLink(ANA, others.id, {
          url: 'https://loja.com/x',
          storeName: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.removeLink(ANA, others.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.createPrice(ANA, others.id, { value: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(others.prices).toEqual([]);
    });
  });

  describe('prices', () => {
    it('records the price with today in São Paulo (KTD14)', async () => {
      const link = makeLink(makeItem(ANA));

      // 01:30 UTC on the 14th is still the 13th in São Paulo.
      jest.setSystemTime(new Date('2026-10-14T01:30:00.000Z'));
      const price = await service.createPrice(ANA, link.id, { value: 99.9 });

      expect(price).toMatchObject({
        value: 99.9,
        recordedOn: noon('2026-10-13'),
      });
      expect(link.prices[0].recordedOn).toEqual(day('2026-10-13'));
    });

    it('brings the previous record back as the current price when the latest is removed', async () => {
      const item = makeItem(ANA);
      const link = makeLink(item);
      makePrice(link, 120, '2026-09-01');
      const latest = makePrice(link, 80, '2026-10-01');

      expect((await service.findItems(ANA))[0].links[0].currentPrice).toBe(80);

      await expect(service.removePrice(ANA, latest.id)).resolves.toBeNull();

      const [view] = await service.findItems(ANA);
      expect(view.links[0]).toMatchObject({
        currentPrice: 120,
        variation: null,
      });
      expect(view.lowestPrice.value).toBe(120);
    });

    it("answers 404 on another user's price", async () => {
      const link = makeLink(makeItem(BIA));
      const price = makePrice(link, 10, '2026-10-01');

      await expect(service.removePrice(ANA, price.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(link.prices).toEqual([price]);
    });
  });
});

describe('Wishlist request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const validate = (body: unknown, metatype: new () => unknown) =>
    pipe.transform(body, { type: 'body', metatype });
  const id = '33333333-3333-3333-3333-333333333333';

  it.each([
    ['an empty name', { name: '' }],
    ['a blank name', { name: '   ' }],
    ['no name', {}],
    ['a numeric name', { name: 10 }],
  ])('rejects a list with %s with 400', async (_, body) => {
    await expect(validate(body, SaveWishlistListDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a blank name', { name: ' ' }],
    ['no name', {}],
    ['a wishlistId that is not a uuid', { name: 'Fone', wishlistId: '1' }],
    ['a categoryId that is not a uuid', { name: 'Fone', categoryId: '1' }],
    ['a month without a dash', { name: 'Fone', plannedMonth: '202612' }],
    ['month 13', { name: 'Fone', plannedMonth: '2026-13' }],
    ['day 0', { name: 'Fone', plannedMonth: '2026-12', plannedDay: 0 }],
    ['day 32', { name: 'Fone', plannedMonth: '2026-12', plannedDay: 32 }],
    [
      'a fractional day',
      { name: 'Fone', plannedMonth: '2026-12', plannedDay: 1.5 },
    ],
    ['a text day', { name: 'Fone', plannedMonth: '2026-12', plannedDay: '10' }],
  ])('rejects an item with %s with 400', async (_, body) => {
    await expect(validate(body, SaveWishlistItemDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts an item with only a name and one with every field', async () => {
    await expect(
      validate({ name: 'Fone' }, SaveWishlistItemDto),
    ).resolves.toEqual({ name: 'Fone' });
    const full = {
      name: 'Fone',
      wishlistId: id,
      categoryId: id,
      plannedMonth: '2026-12',
      plannedDay: 31,
    };
    await expect(validate(full, SaveWishlistItemDto)).resolves.toEqual(full);
  });

  it.each([
    ['a javascript: address', 'javascript:alert(1)'],
    ['an address without a protocol', 'loja.com/produto'],
    ['an ftp address', 'ftp://loja.com/produto'],
    ['an empty address', ''],
  ])('rejects a link with %s with 400', async (_, url) => {
    await expect(
      validate({ url, storeName: 'Loja' }, SaveWishlistLinkDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['an empty store name', { url: 'https://loja.com/p', storeName: '' }],
    ['a blank store name', { url: 'https://loja.com/p', storeName: '  ' }],
    ['no store name', { url: 'https://loja.com/p' }],
    ['no address', { storeName: 'Loja' }],
  ])('rejects a link with %s with 400', async (_, body) => {
    await expect(validate(body, SaveWishlistLinkDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts http and https links', async () => {
    for (const url of ['http://loja.com/p', 'https://www.loja.com/p?a=1']) {
      await expect(
        validate({ url, storeName: 'Loja' }, SaveWishlistLinkDto),
      ).resolves.toEqual({ url, storeName: 'Loja' });
    }
  });

  it.each([
    ['zero', { value: 0 }],
    ['a negative value', { value: -5 }],
    ['three decimals', { value: 1.005 }],
    ['a text value', { value: '10' }],
    ['no value', {}],
  ])('rejects a price with %s with 400', async (_, body) => {
    await expect(validate(body, CreateWishlistPriceDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts a price with two decimals', async () => {
    await expect(
      validate({ value: 99.99 }, CreateWishlistPriceDto),
    ).resolves.toEqual({ value: 99.99 });
  });

  it.each([
    ['no value', { paidDate: '2026-10-13' }],
    ['zero', { paidValue: 0, paidDate: '2026-10-13' }],
    ['three decimals', { paidValue: 1.005, paidDate: '2026-10-13' }],
    ['a text value', { paidValue: '10', paidDate: '2026-10-13' }],
    ['no date', { paidValue: 10 }],
    ['an invalid date', { paidValue: 10, paidDate: 'ontem' }],
  ])('rejects a purchase with %s with 400', async (_, body) => {
    await expect(
      validate(body, PurchaseWishlistItemDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a purchase with a value and an ISO date', async () => {
    const body = { paidValue: 499.9, paidDate: '2026-10-13T15:00:00.000Z' };

    await expect(validate(body, PurchaseWishlistItemDto)).resolves.toEqual(
      body,
    );
  });

  it.each([
    ['a day without a month', { plannedDay: 10 }],
    ['no body', {}],
    ['month 13', { plannedMonth: '2026-13' }],
    ['day 0', { plannedMonth: '2026-12', plannedDay: 0 }],
    ['day 32', { plannedMonth: '2026-12', plannedDay: 32 }],
    ['a fractional day', { plannedMonth: '2026-12', plannedDay: 1.5 }],
  ])('rejects a postponement with %s with 400', async (_, body) => {
    await expect(
      validate(body, PostponeWishlistItemDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a postponement with a month, with or without a day', async () => {
    for (const body of [
      { plannedMonth: '2026-12' },
      { plannedMonth: '2026-12', plannedDay: 31 },
    ]) {
      await expect(validate(body, PostponeWishlistItemDto)).resolves.toEqual(
        body,
      );
    }
  });
});
