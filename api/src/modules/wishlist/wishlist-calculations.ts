import { addDays } from 'src/modules/cards/card-calculations';
import {
  fromCents,
  getDayInMonth,
  getMonthKey,
  getMonthStart,
  parseMonthKey,
  toCents,
} from 'src/shared/calendar';

export const STILL_WANTED_INTERVAL_DAYS = 30;

export type PlannedDate = {
  /** First day of the planned month. */
  plannedMonth: Date;
  /** The planned day as a full calendar date, or null when no day was chosen. */
  plannedDay: Date | null;
};

export type WishlistPriceSnapshot = {
  value: number;
  recordedOn: Date;
  createdAt: Date;
};

export type WishlistLinkSnapshot = {
  id: string;
  storeName: string;
  createdAt: Date;
  prices: WishlistPriceSnapshot[];
};

export type LinkPriceSummary = {
  currentPrice: number | null;
  currentRecordedOn: Date | null;
  variation: number | null;
};

export type ItemLowestPrice = {
  value: number;
  storeName: string;
  recordedOn: Date;
};

// Dates (KTD2, KTD3) ---------------------------------------------------------

/** Month key ('YYYY-MM') and optional day (1-31) as the stored planned date. */
export function toPlannedDate(month: string, day?: number | null): PlannedDate {
  const monthKey = parseMonthKey(month);

  return {
    plannedMonth: getMonthStart(monthKey),
    plannedDay: day ? getDayInMonth(monthKey, day) : null,
  };
}

/**
 * Next reminder from the planned date (R13, R14, R15): the planned day, or the
 * first day of the planned month; 30 days from today without a planned date.
 * A date that has already arrived moves to tomorrow.
 */
export function getPlannedReminder(planned: PlannedDate | null, today: Date) {
  if (!planned) {
    return addDays(today, STILL_WANTED_INTERVAL_DAYS);
  }

  const reminder = planned.plannedDay ?? planned.plannedMonth;

  return reminder <= today ? addDays(today, 1) : reminder;
}

/** "Ainda quero" moves the reminder 30 days after the answer (R19). */
export function getStillWantedReminder(today: Date) {
  return addDays(today, STILL_WANTED_INTERVAL_DAYS);
}

export function isReminderDue(nextReminder: Date, today: Date) {
  return nextReminder <= today;
}

/** Compares the normalized stored values, so equal dates in any format match. */
export function hasPlannedDateChanged(
  before: PlannedDate | null,
  after: PlannedDate | null,
) {
  const key = (planned: PlannedDate | null) =>
    planned
      ? `${getMonthKey(planned.plannedMonth)}:${
          planned.plannedDay?.getTime() ?? ''
        }`
      : '';

  return key(before) !== key(after);
}

// Prices (KTD14) -------------------------------------------------------------

const byRecordOrder = (a: WishlistPriceSnapshot, b: WishlistPriceSnapshot) =>
  a.recordedOn.getTime() - b.recordedOn.getTime() ||
  a.createdAt.getTime() - b.createdAt.getTime();

/** Current price is the latest record; variation is current minus the first. */
export function getLinkPriceSummary(
  link: Pick<WishlistLinkSnapshot, 'prices'>,
): LinkPriceSummary {
  if (!link.prices.length) {
    return { currentPrice: null, currentRecordedOn: null, variation: null };
  }

  const ordered = [...link.prices].sort(byRecordOrder);
  const first = ordered[0];
  const current = ordered[ordered.length - 1];

  return {
    currentPrice: current.value,
    currentRecordedOn: current.recordedOn,
    variation:
      ordered.length > 1
        ? fromCents(toCents(current.value) - toCents(first.value))
        : null,
  };
}

/** Lowest current price among the links, with its store and record date (R11). */
export function getItemLowestPrice(
  links: WishlistLinkSnapshot[],
): ItemLowestPrice | null {
  let lowest: ItemLowestPrice | null = null;

  for (const link of links) {
    const { currentPrice, currentRecordedOn } = getLinkPriceSummary(link);

    if (currentPrice !== null && (!lowest || currentPrice < lowest.value)) {
      lowest = {
        value: currentPrice,
        storeName: link.storeName,
        recordedOn: currentRecordedOn,
      };
    }
  }

  return lowest;
}
