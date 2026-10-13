import { QueryClient } from '@tanstack/react-query'

// Goals, card invoices, transactions and account balances are derived from
// the same transactions, so any mutation that moves money refreshes them all.
export function invalidateMoneyQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['goals'] }),
    queryClient.invalidateQueries({ queryKey: ['cards'] }),
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
  ])
}
