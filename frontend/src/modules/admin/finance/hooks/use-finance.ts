import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getExpenseCategories,
  getExpenses,
  getFinanceSummary,
  markExpensePaid,
  saveExpense,
  type ExpenseInput,
  type ExpenseQuery,
  type FinanceSummaryFilters,
} from '@/modules/admin/finance/api/finance';

export function useFinanceSummary(filters: FinanceSummaryFilters) {
  return useQuery({ queryKey: ['admin-finance-summary', filters], queryFn: () => getFinanceSummary(filters) });
}

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expenseCategories'], queryFn: getExpenseCategories, staleTime: 5 * 60 * 1000 });
}

export function useExpenses(params: ExpenseQuery) {
  return useQuery({ queryKey: ['admin-expenses', params], queryFn: () => getExpenses(params) });
}

async function invalidateFinanceData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([queryClient.invalidateQueries({ queryKey: ['admin-expenses'] }), queryClient.invalidateQueries({ queryKey: ['admin-finance-summary'] })]);
}

export function useSaveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ExpenseInput }) => saveExpense(id, input),
    onSuccess: async (_, variables) => {
      await invalidateFinanceData(queryClient);
      toast.success(variables.id ? 'Despesa atualizada.' : 'Despesa cadastrada.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a despesa.'),
  });
}

export function useMarkExpensePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markExpensePaid,
    onSuccess: async () => {
      await invalidateFinanceData(queryClient);
      toast.success('Despesa marcada como paga.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a despesa.'),
  });
}
