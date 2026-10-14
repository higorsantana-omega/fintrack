export interface Transaction {
  id: string
  name: string
  value: number
  date: string
  type: 'INCOME' | 'EXPENSE'

  categoryId?: string
  bankAccountId?: string
  goalId?: string | null
  debtId?: string | null
  borrowerId?: string | null

  category?: {
    id: string
    name: string
    icon: string
  }
}