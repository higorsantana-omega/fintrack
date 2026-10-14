// Category names and icons every user gets. The create_cards and
// create_debts migrations repeat these values in SQL for the users that
// existed before them.
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentação', icon: 'food' },
  { name: 'Mercado', icon: 'grocery' },
  { name: 'Lazer', icon: 'fun' },
  { name: 'Transporte', icon: 'transport' },
  { name: 'Viagem', icon: 'travel' },
  { name: 'Educação', icon: 'education' },
  { name: 'Roupas', icon: 'clothes' },
  { name: 'Outros', icon: 'other' },
];

export const CARD_PAYMENT_CATEGORY_NAME = 'Fatura de cartão';
export const CARD_PAYMENT_CATEGORY_ICON = 'credit-card';

export const DEBT_CATEGORY_NAME = 'Dívidas';
export const DEBT_CATEGORY_ICON = 'debt';
export const LOAN_CATEGORY_NAME = 'Empréstimos';
export const LOAN_CATEGORY_ICON = 'loan';
