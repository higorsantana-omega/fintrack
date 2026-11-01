import {
  WishlistItemWithRelations,
  WishlistLinkWithPrices,
} from 'src/database/repositories/wishlist.repositories';
import { formatMonthKey, getMonthKey, toNoonUtc } from 'src/shared/calendar';
import {
  getItemLowestPrice,
  getLinkPriceSummary,
} from './wishlist-calculations';

type Price = WishlistLinkWithPrices['prices'][number];

const toNoonOrNull = (date: Date | null) => (date ? toNoonUtc(date) : null);

export function toListView(list: {
  id: string;
  name: string;
  key: string | null;
}) {
  return { id: list.id, name: list.name, key: list.key };
}

export function toPriceView(price: Price) {
  return {
    id: price.id,
    value: price.value,
    recordedOn: toNoonUtc(price.recordedOn),
    createdAt: price.createdAt,
  };
}

export function toLinkView(link: WishlistLinkWithPrices) {
  const { currentPrice, currentRecordedOn, variation } =
    getLinkPriceSummary(link);

  return {
    id: link.id,
    url: link.url,
    storeName: link.storeName,
    createdAt: link.createdAt,
    currentPrice,
    currentRecordedOn: toNoonOrNull(currentRecordedOn),
    variation,
    prices: link.prices.map(toPriceView),
  };
}

/** The item as the web reads it; the reminders endpoint reuses it (KTD11). */
export function toItemView(item: WishlistItemWithRelations) {
  const lowestPrice = getItemLowestPrice(item.links);

  return {
    id: item.id,
    name: item.name,
    wishlistId: item.wishlistId,
    status: item.status,
    category: item.category,
    plannedMonth: item.plannedMonth
      ? formatMonthKey(getMonthKey(item.plannedMonth))
      : null,
    plannedDay: item.plannedDay ? item.plannedDay.getUTCDate() : null,
    nextReminder: toNoonOrNull(item.nextReminder),
    paidValue: item.paidValue,
    paidDate: toNoonOrNull(item.paidDate),
    createdAt: item.createdAt,
    lowestPrice: lowestPrice
      ? { ...lowestPrice, recordedOn: toNoonUtc(lowestPrice.recordedOn) }
      : null,
    links: item.links.map(toLinkView),
  };
}
