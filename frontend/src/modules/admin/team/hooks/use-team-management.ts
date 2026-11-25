import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createTimeOff,
  getTeamProfile,
  getTeamSchedule,
  getTeamServiceCatalog,
  getTeamTimeOffBarbers,
  previewTeamSchedule,
  previewTimeOff,
  saveTeamProfile,
  saveTeamSchedule,
} from '@/modules/admin/team/api/team-management';
import type { TeamProfileInput, TeamScheduleInput, TimeOffInput } from '@/modules/admin/team/api/team-management';
import { HttpError } from '@/shared/lib/http';

export function useTeamServiceCatalog() {
  return useQuery({ queryKey: ['team-service-catalog'], queryFn: getTeamServiceCatalog });
}

export function useTeamTimeOffBarbers() {
  return useQuery({ queryKey: ['team-timeoff-barbers'], queryFn: getTeamTimeOffBarbers });
}

export function useTeamProfile(id: string | null) {
  return useQuery({ queryKey: ['team-profile', id], queryFn: () => getTeamProfile(String(id)), enabled: Boolean(id) });
}

export function useSaveTeamProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: TeamProfileInput }) => saveTeamProfile(id, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['team-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['team-service-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-team-week'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-team'] }),
      ]);
      if (variables.id) await queryClient.invalidateQueries({ queryKey: ['team-profile', variables.id] });
      toast.success(variables.id ? 'Profissional atualizado.' : 'Profissional cadastrado.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o profissional.'),
  });
}

export function useTeamSchedule(id: string) {
  return useQuery({ queryKey: ['team-schedule', id], queryFn: () => getTeamSchedule(id), enabled: Boolean(id) });
}

export function usePreviewTeamSchedule() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamScheduleInput }) => previewTeamSchedule(id, input),
    onError: (error) => {
      if (!(error instanceof HttpError && error.status === 409)) toast.error(error instanceof Error ? error.message : 'Não foi possível conferir os agendamentos.');
    },
  });
}

export function useSaveTeamSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, confirmAffected }: { id: string; input: TeamScheduleInput; confirmAffected?: boolean }) => saveTeamSchedule(id, input, confirmAffected),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['team-schedule', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-team-week'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-availability'] }),
      ]);
      toast.success('Escala semanal atualizada.');
    },
    onError: (error) => {
      if (!(error instanceof HttpError && error.status === 409)) toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a escala.');
    },
  });
}

export function usePreviewTimeOff() {
  return useMutation({ mutationFn: previewTimeOff, onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível conferir este período.') });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TimeOffInput) => createTimeOff(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-time-blocks'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-agenda-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-team-week'] }),
      ]);
      toast.success('Período registrado na agenda.');
    },
    onError: (error) => {
      if (!(error instanceof HttpError && error.status === 409)) toast.error(error instanceof Error ? error.message : 'Não foi possível registrar o período.');
    },
  });
}
