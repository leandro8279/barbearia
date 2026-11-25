import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMyDayAppointments, getMyDayCommissions, updateAppointmentStatus } from '@/modules/admin/dashboard/api/my-day';

export function useMyDayAppointments(date: string) {
  return useQuery({ queryKey: ['admin-my-day', date], queryFn: () => getMyDayAppointments(date), refetchInterval: 30_000, refetchOnWindowFocus: true });
}

export function useMyDayCommissions(date: string, enabled: boolean) {
  return useQuery({ queryKey: ['admin-my-day-commissions', date], queryFn: () => getMyDayCommissions(date), enabled, refetchInterval: 30_000, refetchOnWindowFocus: true });
}

export function useUpdateMyDayAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'checked_in' | 'in_service' }) => updateAppointmentStatus(id, status),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-my-day'] });
      toast.success(variables.status === 'checked_in' ? 'Cliente marcado como presente.' : 'Atendimento iniciado.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o atendimento.'),
  });
}
