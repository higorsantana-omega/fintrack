import { getMonthKey, toCents } from 'src/shared/calendar';
import {
  CARD_PAYMENT_CATEGORY_KEY,
  DEBT_CATEGORY_KEY,
  GOAL_CATEGORY_KEY,
  LOAN_CATEGORY_KEY,
} from './categories.constants';
import {
  CardSnapshot,
  RecurringChargeRule,
  getForecasts,
} from '../cards/card-calculations';

// Types ------------------------------------------------------------------------

export type CategoryType = 'EXPENSE' | 'INCOME';

/** The minimal shape of a category row; keeps this module free of Prisma. */
export type CategoryNode = {
  id: string;
  type: CategoryType;
  key: string | null;
  parentId: string | null;
};

/** A counted item in cents: negative for refunds. */
export type CountedItem = { categoryId: string | null; cents: number };

export type AccountTransactionLinks = {
  type: CategoryType;
  creditCardId: string | null;
  goalId: string | null;
  borrowerId: string | null;
  debtId: string | null;
  categoryKey: string | null;
};

// Account transactions (KTD5) --------------------------------------------------

const SYSTEM_KEYS_OUT_OF_TOTALS = [
  CARD_PAYMENT_CATEGORY_KEY,
  GOAL_CATEGORY_KEY,
  LOAN_CATEGORY_KEY,
];

/**
 * Whether an account transaction counts in the tab: the link decides first
 * (a recategorized card payment stays out), the key covers old rows (R9).
 */
export function countsInTab(
  transaction: AccountTransactionLinks,
  tab: CategoryType,
) {
  const { type, categoryKey } = transaction;
  const isIncome = type === 'INCOME';

  if (type !== tab) return false;
  if (transaction.creditCardId || transaction.goalId || transaction.borrowerId)
    return false;
  if (isIncome && transaction.debtId) return false;
  if (categoryKey && SYSTEM_KEYS_OUT_OF_TOTALS.includes(categoryKey))
    return false;

  return !(isIncome && categoryKey === DEBT_CATEGORY_KEY);
}

// Card items (KTD6) ------------------------------------------------------------

type MonthPurchase = {
  id: string;
  kind: 'PURCHASE' | 'REFUND';
  description: string;
  purchaseDate: Date;
  installmentsCount: number;
  category: { id: string } | null;
  installments: { number: number; invoiceMonth: Date; value: number }[];
};

type MonthRecurringCharge = RecurringChargeRule & {
  description: string;
  category: { id: string } | null;
};

/** The shape `CardsRepository.findManyByUserId` returns, as far as needed. */
export type MonthCard = Omit<CardSnapshot, 'purchases' | 'recurringCharges'> & {
  purchases: MonthPurchase[];
  recurringCharges: MonthRecurringCharge[];
};

export type MonthCardItem = CountedItem & {
  /** `purchaseId:number` or `ruleId:date`, as `CardsService.toInvoiceView`. */
  id: string;
  cardId: string;
  purchaseId: string | null;
  recurringChargeId: string | null;
  description: string;
  date: Date;
  installmentNumber: number;
  installmentsCount: number;
  isForecast: boolean;
  isRefund: boolean;
};

/**
 * Installments and refunds whose invoice is the month, plus the month's
 * forecasts, of all cards. Forecasts use the rule's current category, and
 * `getForecasts` gives none for an archived card.
 */
export function getMonthCardItems(
  cards: MonthCard[],
  today: Date,
  month: number,
): MonthCardItem[] {
  return cards.flatMap((card) => {
    const installments = card.purchases.flatMap((purchase) =>
      purchase.installments
        .filter(({ invoiceMonth }) => getMonthKey(invoiceMonth) === month)
        .map((installment): MonthCardItem => {
          const isRefund = purchase.kind === 'REFUND';
          const cents = toCents(installment.value);

          return {
            id: `${purchase.id}:${installment.number}`,
            cardId: card.id,
            purchaseId: purchase.id,
            recurringChargeId: null,
            categoryId: purchase.category?.id ?? null,
            cents: isRefund ? -cents : cents,
            description: purchase.description,
            date: purchase.purchaseDate,
            installmentNumber: installment.number,
            installmentsCount: purchase.installmentsCount,
            isForecast: false,
            isRefund,
          };
        }),
    );

    const forecasts = getForecasts(card, today, month)
      .filter((forecast) => forecast.invoiceMonth === month)
      .map((forecast): MonthCardItem => {
        const rule = card.recurringCharges.find(
          ({ id }) => id === forecast.recurringChargeId,
        );

        return {
          id: `${rule.id}:${forecast.date.toISOString()}`,
          cardId: card.id,
          purchaseId: null,
          recurringChargeId: rule.id,
          categoryId: rule.category?.id ?? null,
          cents: toCents(forecast.value),
          description: rule.description,
          date: forecast.date,
          installmentNumber: 1,
          installmentsCount: 1,
          isForecast: true,
          isRefund: false,
        };
      });

    return [...installments, ...forecasts];
  });
}

// Totals (KTD4) ----------------------------------------------------------------

export type CategoryMonthTotal = {
  id: string;
  parentId: string | null;
  /** Items linked straight to the category. */
  direct: number;
  /** A group adds its subcategories; a subcategory equals `direct`. */
  total: number;
  /** Groups only, over positive totals; 0 for subcategories and negatives. */
  share: number;
};

/** All amounts in cents. */
export type CategoryMonthTotals = {
  categories: CategoryMonthTotal[];
  noCategory: { total: number; share: number };
  net: number;
};

/**
 * Totals of the tab: items in a category outside the tab's tree (or with
 * none) go to "no category" (R28). Shares are taken over the positive group
 * totals and a positive "no category" (R23, R29).
 */
export function getCategoryMonthTotals(
  categories: CategoryNode[],
  items: CountedItem[],
  tab: CategoryType,
): CategoryMonthTotals {
  const tree = categories.filter(({ type }) => type === tab);
  const direct = new Map(tree.map(({ id }) => [id, 0]));
  let noCategory = 0;

  items.forEach(({ categoryId, cents }) => {
    if (direct.has(categoryId)) {
      direct.set(categoryId, direct.get(categoryId) + cents);
    } else {
      noCategory += cents;
    }
  });

  const totalOf = (id: string) =>
    tree
      .filter(({ parentId }) => parentId === id)
      .reduce(
        (sum, { id: childId }) => sum + direct.get(childId),
        direct.get(id),
      );

  const rows = tree.map(({ id, parentId }) => ({
    id,
    parentId,
    direct: direct.get(id),
    total: parentId === null ? totalOf(id) : direct.get(id),
  }));
  const positive = (cents: number) => Math.max(0, cents);
  const positiveSum =
    rows
      .filter(({ parentId }) => parentId === null)
      .reduce((sum, { total }) => sum + positive(total), 0) +
    positive(noCategory);
  const share = (cents: number) =>
    positiveSum > 0 ? positive(cents) / positiveSum : 0;

  return {
    categories: rows.map((row) => ({
      ...row,
      share: row.parentId === null ? share(row.total) : 0,
    })),
    noCategory: { total: noCategory, share: share(noCategory) },
    net: items.reduce((sum, { cents }) => sum + cents, 0),
  };
}
