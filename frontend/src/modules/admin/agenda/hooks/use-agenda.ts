import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  cancelAgendaAppointment,
  createAgendaTimeBlocks,
  createAgendaAppointment as createAgendaAppointmentRequest,
  getAgendaAppointmentDetail,
  getAgendaAppointments,
  getAgendaAvailabilitySlots,
  getAgendaBarbers,
  getAgendaCustomerSuggestions,
  getAgendaEligibleBarbers,
  getAgendaServices,
  getAgendaTimeBlocks,
  getAgendaUnit,
  markAgendaAppointmentNoShow,
  openAgendaAppointmentTab,
  rescheduleAgendaAppointment,
  finishAgendaService,
  startAgendaService,
  updateAgendaAppointmentItems,
  updateAgendaAppointmentStatus,
} from '@/modules/admin/agenda/api/agenda';
import { HttpError } from '@/shared/lib/http';

export function useAgendaBarbers(userId?: number) {
  return useQuery({ queryKey: ['admin-agenda-barbers', userId ?? 'all'], queryFn: () => getAgendaBarbers(userId) });
}

export function useAgendaUnit() {
  return useQuery({ queryKey: ['admin-agenda-unit'], queryFn: getAgendaUnit });
}

export function useAgendaAppointments(from: string, to: string, barberId?: number | 'me') {
  return useQuery({
    queryKey: ['admin-agenda-appointments', { from, to, barberId }],
    queryFn: () => getAgendaAppointments(from, to, barberId),
    enabled: Boolean(from && to),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAgendaTimeBlocks() {
  return useQuery({ queryKey: ['admin-agenda-time-blocks'], queryFn: getAgendaTimeBlocks, refetchInterval: 30_000, refetchOnWindowFocus: true });
}

export function useRescheduleAgendaAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, start, barberId, reason, notifyCustomer }: { id: number; start: string; barberId: number; reason: string; notifyCustomer: boolean }) =>
      rescheduleAgendaAppointment(id, { start, barberId, reason, notifyCustomer }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointment'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-time-blocks'] }),
      ]);
      toast.success('Agendamento remarcado.');
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] });
      if (error instanceof HttpError && error.status === 409) {
        toast.error('Esse horário não está mais disponível. A agenda foi atualizada.');
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Não foi possível remarcar o agendamento.');
    },
  });
}

export function useCreateAgendaTimeBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgendaTimeBlocks,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-time-blocks'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-availability'] }),
      ]);
      toast.success('Bloqueio criado; a disponibilidade foi atualizada.');
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 409) return;
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o bloqueio.');
    },
  });
}

export function useAgendaServices() {
  return useQuery({ queryKey: ['admin-agenda-services'], queryFn: getAgendaServices, staleTime: 60_000 });
}

export function useAgendaCustomerSuggestions(query: string) {
  return useQuery({ queryKey: ['admin-agenda-customer-suggestions', query.trim()], queryFn: () => getAgendaCustomerSuggestions(query.trim()), enabled: query.trim().length >= 2 });
}

export function useAgendaEligibleBarbers(serviceIds: number[]) {
  return useQuery({ queryKey: ['admin-agenda-eligible-barbers', serviceIds], queryFn: () => getAgendaEligibleBarbers(serviceIds), enabled: serviceIds.length > 0 });
}

export function useAgendaAvailabilitySlots(input: { serviceIds: number[]; barberId: number | null; date: string; bypassAdvance: boolean; allowOutOfHours: boolean }) {
  return useQuery({
    queryKey: ['admin-agenda-availability', input],
    queryFn: () => getAgendaAvailabilitySlots({ ...input, barberId: Number(input.barberId) }),
    enabled: input.serviceIds.length > 0 && input.barberId !== null && Boolean(input.date),
  });
}

export function useAgendaAppointmentDetail(id: number | null, barberMode = false) {
  return useQuery({
    queryKey: ['admin-agenda-appointment', id, barberMode],
    queryFn: () => getAgendaAppointmentDetail(Number(id), barberMode),
    enabled: id !== null && Number.isInteger(id) && id > 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function useAppointmentMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>, successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointment'] }),
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['tabs'] }),
      ]);
      toast.success(successMessage);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o agendamento.'),
  });
}

export function useCreateAgendaAppointment() {
  return useAppointmentMutation(createAgendaAppointmentRequest, 'Agendamento criado.');
}

export function useUpdateAgendaAppointmentStatus() {
  return useAppointmentMutation(({ id, status }: { id: number; status: string }) => updateAgendaAppointmentStatus(id, status), 'Status atualizado.');
}

export function useStartAgendaService() {
  const queryClient = useQueryClient();
  const invalidate = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointment'] }),
      queryClient.invalidateQueries({ queryKey: ['appointments'] }),
      queryClient.invalidateQueries({ queryKey: ['tabs'] }),
    ]);
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => startAgendaService(id, status),
    onSuccess: async () => {
      await invalidate();
      toast.success('Atendimento iniciado.');
    },
    onError: async (error) => {
      await invalidate();
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o atendimento.');
    },
  });
}

export function useFinishAgendaService() {
  return useAppointmentMutation(({ id }: { id: number }) => finishAgendaService(id), 'Atendimento finalizado; duração real registrada.');
}

export function useMarkAgendaAppointmentNoShow() {
  return useAppointmentMutation(({ id, reason }: { id: number; reason: string }) => markAgendaAppointmentNoShow(id, reason), 'Ausência registrada.');
}

export function useCancelAgendaAppointment() {
  return useAppointmentMutation(
    ({ id, reason, cancellationType, offerReschedule }: { id: number; reason: string; cancellationType: 'customer' | 'barbershop'; offerReschedule: boolean }) =>
      cancelAgendaAppointment(id, { reason, cancellationType, offerReschedule }),
    'Agendamento cancelado.',
  );
}

export function useUpdateAgendaAppointmentItems() {
  return useAppointmentMutation(
    ({ id, serviceIds, barberId }: { id: number; serviceIds: number[]; barberId: number }) => updateAgendaAppointmentItems(id, { serviceIds, barberId }),
    'Serviços atualizados.',
  );
}

export function useOpenAgendaAppointmentTab() {
  return useAppointmentMutation((appointmentId: number) => openAgendaAppointmentTab(appointmentId), 'Comanda pronta.');
}
