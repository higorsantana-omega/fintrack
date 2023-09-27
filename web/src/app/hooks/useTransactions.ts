import { useQuery } from "@tanstack/react-query";
import { TransactionsFilters, transactionsService } from "../services/transactionsService";

export function useTransactions (filters: TransactionsFilters) {
  const { data, isFetching, isInitialLoading, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsService.getAll(filters)
  })
  return {
    transactions: data ?? [],
    isLoading: isFetching,
    isInitialLoading,
    refetch
  }
}