import { randomUUID } from 'node:crypto';
import { TransactionType } from '@prisma/client';

// The default category tree every user gets. The API stores and returns the
// English `name`; the web translates it by `key`. The category_tree migration
// repeats this catalog in SQL for the users that existed before it, and `icon`
// is a lucide-react icon name (web/src/view/components/icons/categories).
export interface CategorySeed {
  key: string;
  name: string;
  icon: string;
}

export interface CategoryGroupSeed extends CategorySeed {
  color: string;
  subcategories: CategorySeed[];
}

export const EXPENSE_CATEGORY_TREE: CategoryGroupSeed[] = [
  {
    key: 'shopping',
    name: 'Shopping',
    icon: 'shopping-bag',
    color: '#E64980',
    subcategories: [
      {
        key: 'online_shopping',
        name: 'Online shopping',
        icon: 'shopping-cart',
      },
      { key: 'bookstore', name: 'Bookstore', icon: 'book-open' },
      { key: 'sporting_goods', name: 'Sporting goods', icon: 'volleyball' },
      { key: 'electronics', name: 'Electronics', icon: 'cpu' },
      { key: 'kids_toys', name: 'Kids and toys', icon: 'blocks' },
      { key: 'office_supplies', name: 'Office supplies', icon: 'paperclip' },
      { key: 'pets', name: 'Pets', icon: 'paw-print' },
      { key: 'clothing', name: 'Clothing', icon: 'shirt' },
    ],
  },
  {
    key: 'education',
    name: 'Education',
    icon: 'graduation-cap',
    color: '#4C6EF5',
    subcategories: [
      { key: 'school', name: 'School', icon: 'school' },
      { key: 'online_courses', name: 'Online courses', icon: 'monitor-play' },
      { key: 'kindergarten', name: 'Kindergarten', icon: 'baby' },
      { key: 'university', name: 'University', icon: 'university' },
    ],
  },
  {
    key: 'services',
    name: 'Services',
    icon: 'phone',
    color: '#15AABF',
    subcategories: [
      { key: 'telecom', name: 'Telecom', icon: 'radio-tower' },
      { key: 'internet', name: 'Internet', icon: 'wifi' },
      { key: 'mobile_phone', name: 'Mobile phone', icon: 'smartphone' },
      { key: 'tv', name: 'TV', icon: 'tv' },
    ],
  },
  {
    key: 'utilities',
    name: 'Utilities',
    icon: 'plug-zap',
    color: '#FAB005',
    subcategories: [
      { key: 'electricity', name: 'Electricity', icon: 'zap' },
      { key: 'gas', name: 'Gas', icon: 'flame' },
      { key: 'water', name: 'Water', icon: 'droplets' },
    ],
  },
  {
    key: 'food',
    name: 'Food',
    icon: 'utensils',
    color: '#FD7E14',
    subcategories: [
      { key: 'delivery', name: 'Delivery', icon: 'bike' },
      { key: 'supermarket', name: 'Supermarket', icon: 'shopping-basket' },
      { key: 'restaurants', name: 'Restaurants', icon: 'utensils-crossed' },
    ],
  },
  {
    key: 'health',
    name: 'Health',
    icon: 'heart-pulse',
    color: '#FA5252',
    subcategories: [
      { key: 'dentist', name: 'Dentist', icon: 'smile' },
      { key: 'pharmacy', name: 'Pharmacy', icon: 'pill' },
      { key: 'hospital_labs', name: 'Hospital and labs', icon: 'hospital' },
      { key: 'optometry', name: 'Optometry', icon: 'glasses' },
      {
        key: 'health_insurance',
        name: 'Health insurance',
        icon: 'shield-plus',
      },
    ],
  },
  {
    key: 'transfers',
    name: 'Transfers',
    icon: 'arrow-left-right',
    color: '#868E96',
    subcategories: [
      { key: 'pix', name: 'PIX', icon: 'qr-code' },
      { key: 'boleto', name: 'Boleto', icon: 'barcode' },
      { key: 'doc', name: 'DOC', icon: 'file-text' },
      { key: 'ted', name: 'TED', icon: 'arrow-right-left' },
      {
        key: 'third_party_transfers',
        name: 'Third-party transfers',
        icon: 'users',
      },
    ],
  },
  {
    key: 'housing',
    name: 'Housing',
    icon: 'house',
    color: '#7950F2',
    subcategories: [
      { key: 'household_items', name: 'Household items', icon: 'armchair' },
      { key: 'rent', name: 'Rent', icon: 'key-round' },
      { key: 'property_tax', name: 'Property tax', icon: 'landmark' },
    ],
  },
  {
    key: 'digital_services',
    name: 'Digital services',
    icon: 'cloud',
    color: '#BE4BDB',
    subcategories: [
      { key: 'streaming', name: 'Streaming', icon: 'clapperboard' },
      { key: 'music', name: 'Music', icon: 'music' },
      { key: 'games', name: 'Games', icon: 'gamepad-2' },
      { key: 'cashback', name: 'Cashback', icon: 'badge-percent' },
    ],
  },
  {
    key: 'leisure',
    name: 'Leisure',
    icon: 'party-popper',
    color: '#228BE6',
    subcategories: [
      { key: 'tickets', name: 'Tickets', icon: 'ticket' },
      { key: 'gym', name: 'Gym', icon: 'dumbbell' },
      { key: 'wellness', name: 'Wellness', icon: 'flower-2' },
      {
        key: 'wellness_fitness',
        name: 'Wellness and fitness',
        icon: 'activity',
      },
      { key: 'entertainment', name: 'Entertainment', icon: 'popcorn' },
      { key: 'stadiums_arenas', name: 'Stadiums and arenas', icon: 'trophy' },
      { key: 'sports', name: 'Sports', icon: 'medal' },
      { key: 'tourism', name: 'Tourism', icon: 'plane' },
    ],
  },
  {
    key: 'transport',
    name: 'Transport',
    icon: 'car',
    color: '#12B886',
    subcategories: [
      { key: 'fuel', name: 'Fuel', icon: 'fuel' },
      { key: 'public_transport', name: 'Public transport', icon: 'bus' },
      {
        key: 'taxi_rideshare',
        name: 'Taxi and rideshare',
        icon: 'car-taxi-front',
      },
      { key: 'parking', name: 'Parking', icon: 'square-parking' },
      { key: 'toll', name: 'Toll', icon: 'milestone' },
      {
        key: 'vehicle_maintenance',
        name: 'Vehicle maintenance',
        icon: 'wrench',
      },
      {
        key: 'vehicle_insurance',
        name: 'Vehicle insurance',
        icon: 'shield-check',
      },
      {
        key: 'vehicle_tax',
        name: 'Vehicle tax and licensing',
        icon: 'file-badge',
      },
    ],
  },
  {
    key: 'taxes_fees',
    name: 'Taxes and fees',
    icon: 'receipt',
    color: '#212529',
    subcategories: [
      { key: 'income_tax', name: 'Income tax', icon: 'percent' },
      { key: 'bank_fees', name: 'Bank fees', icon: 'banknote' },
      {
        key: 'interest_fines',
        name: 'Interest and fines',
        icon: 'triangle-alert',
      },
      { key: 'other_taxes', name: 'Other taxes', icon: 'file-minus' },
    ],
  },
  {
    key: 'personal_care',
    name: 'Personal care',
    icon: 'sparkles',
    color: '#BE4BDB',
    subcategories: [
      {
        key: 'barber_hairdresser',
        name: 'Hairdresser and barber',
        icon: 'scissors',
      },
      { key: 'cosmetics', name: 'Cosmetics', icon: 'palette' },
      { key: 'aesthetics', name: 'Aesthetics', icon: 'flower' },
    ],
  },
  {
    key: 'donations',
    name: 'Donations',
    icon: 'hand-heart',
    color: '#82C91E',
    subcategories: [
      { key: 'charity', name: 'Charity', icon: 'heart-handshake' },
      { key: 'gifts', name: 'Gifts', icon: 'gift' },
      { key: 'tithe', name: 'Tithe', icon: 'church' },
    ],
  },
  {
    key: 'other',
    name: 'Other',
    icon: 'ellipsis',
    color: '#868E96',
    subcategories: [],
  },
];

export const INCOME_CATEGORY_TREE: CategoryGroupSeed[] = [
  {
    key: 'income',
    name: 'Income',
    icon: 'wallet',
    color: '#40C057',
    subcategories: [
      { key: 'salary', name: 'Salary', icon: 'briefcase' },
      { key: 'retirement', name: 'Retirement', icon: 'armchair' },
      {
        key: 'business_activities',
        name: 'Business activities',
        icon: 'store',
      },
      { key: 'government_aid', name: 'Government aid', icon: 'landmark' },
      {
        key: 'non_recurring_income',
        name: 'Non-recurring income',
        icon: 'coins',
      },
    ],
  },
  {
    key: 'investments',
    name: 'Investments',
    icon: 'trending-up',
    color: '#12B886',
    subcategories: [
      {
        key: 'returns_interest',
        name: 'Returns and interest',
        icon: 'percent',
      },
      { key: 'dividends', name: 'Dividends', icon: 'piggy-bank' },
    ],
  },
  {
    key: 'other_income',
    name: 'Other income',
    icon: 'circle-plus',
    color: '#82C91E',
    subcategories: [
      { key: 'reimbursement', name: 'Reimbursement', icon: 'undo-2' },
      { key: 'gift_received', name: 'Gift received', icon: 'gift' },
      { key: 'item_sales', name: 'Item sales', icon: 'tag' },
    ],
  },
];

// System categories serve the Cards, Goals and Debts flows and are never
// edited by the user. Only the expense `debts` shows in the tree, so it is
// the only one with a color.
export const CARD_PAYMENT_CATEGORY_KEY = 'card_payment';
export const GOAL_CATEGORY_KEY = 'goals';
export const DEBT_CATEGORY_KEY = 'debts';
export const LOAN_CATEGORY_KEY = 'loans';

export const SYSTEM_CATEGORY_KEYS = [
  CARD_PAYMENT_CATEGORY_KEY,
  GOAL_CATEGORY_KEY,
  DEBT_CATEGORY_KEY,
  LOAN_CATEGORY_KEY,
];

export interface SystemCategorySeed extends CategorySeed {
  type: TransactionType;
  color?: string;
}

export const SYSTEM_CATEGORIES: SystemCategorySeed[] = [
  {
    key: CARD_PAYMENT_CATEGORY_KEY,
    name: 'Card payment',
    icon: 'credit-card',
    type: TransactionType.EXPENSE,
  },
  {
    key: GOAL_CATEGORY_KEY,
    name: 'Goals',
    icon: 'target',
    type: TransactionType.EXPENSE,
  },
  {
    key: GOAL_CATEGORY_KEY,
    name: 'Goals',
    icon: 'target',
    type: TransactionType.INCOME,
  },
  {
    key: DEBT_CATEGORY_KEY,
    name: 'Debts',
    icon: 'landmark',
    type: TransactionType.EXPENSE,
    color: '#7950F2',
  },
  {
    key: DEBT_CATEGORY_KEY,
    name: 'Debts',
    icon: 'landmark',
    type: TransactionType.INCOME,
  },
  {
    key: LOAN_CATEGORY_KEY,
    name: 'Loans',
    icon: 'hand-coins',
    type: TransactionType.EXPENSE,
  },
  {
    key: LOAN_CATEGORY_KEY,
    name: 'Loans',
    icon: 'hand-coins',
    type: TransactionType.INCOME,
  },
];

// Rows for the signup `createMany`. Ids are generated here so a subcategory
// can point at its group inside the same call.
export function buildDefaultCategories() {
  const tree = (groups: CategoryGroupSeed[], type: TransactionType) =>
    groups.flatMap(({ subcategories, ...group }) => {
      const id = randomUUID();
      return [
        { ...group, id, type },
        ...subcategories.map((sub) => ({
          ...sub,
          id: randomUUID(),
          parentId: id,
          type,
        })),
      ];
    });

  return [
    ...tree(EXPENSE_CATEGORY_TREE, TransactionType.EXPENSE),
    ...tree(INCOME_CATEGORY_TREE, TransactionType.INCOME),
    ...SYSTEM_CATEGORIES.map((category) => ({ ...category, id: randomUUID() })),
  ];
}
