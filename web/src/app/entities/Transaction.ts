export interface BankAccount {
  id: string
  name: string
  value: number
  caetgoryId: string
  type: 'CHECKING' | 'INVESTMENT' | 'CASH'
  color: string
  currentBalance: number
}