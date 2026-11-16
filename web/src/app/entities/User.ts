export type OnboardingStep =
  | 'ACCOUNTS'
  | 'CARDS'
  | 'CARD_ENTRIES'
  | 'BUDGETS'
  | 'GOALS'
  | 'DEBTS'
  | 'WISHLIST'
  | 'REVIEW'

export interface User {
  name: string
  email: string
  onboardingStep: OnboardingStep | null
}
