import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCommissionSummary, settleCommissionPeriod, type CommissionFilters } from '@/modules/admin/commissions/api/commissions';

export function useCommissionSummary(filters: CommissionFilters, isBarber = false) {
  return useQuery({ queryKey: ['admin-commission-summary', isBarber, filters], queryFn: () => getCommissionSummary(filters, isBarber) });
}

export function useSettleCommissionPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settleCommissionPeriod,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-commission-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-my-day-commissions'] });
      toast.success(`Período pago. Despesa #${result.expense.id} registrada.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível pagar este período.'),
  });
}
