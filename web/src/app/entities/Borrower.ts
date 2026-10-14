export type BorrowerMovementKind = 'LEND' | 'RETURN'

export interface Borrower {
  id: string
  name: string
  balance: number
  /** The most a return can be. */
  maxReturn: number
  /** How much was returned over what the person owed. */
  overpaid: number
}

export interface BorrowerMovement {
  id: string
  name: string
  value: number
  date: string
  /** Loans are expenses and returns are incomes. */
  type: 'INCOME' | 'EXPENSE'
  bankAccount: { id: string, name: string, color: string }
}

export interface BorrowerDetail extends Borrower {
  openingBalance: number
  movements: BorrowerMovement[]
}
