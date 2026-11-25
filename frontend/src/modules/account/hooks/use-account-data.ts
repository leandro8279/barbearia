import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccountProfile, updateAccountProfile, type UpdateAccountProfileInput } from '@/modules/account/api/profile';
import { getMyAppointment, getMyAppointments, type AppointmentListParams } from '@/modules/account/api/appointments';
import { getPublicBarbers } from '@/modules/site/api/barbers';
import { MobxQuery } from '@/shared/lib/query';
import { useSessionStore } from '@/shared/stores/session-store';

export function useAccountUser() {
  return useQuery({ queryKey: ['users', 'me'], queryFn: getAccountProfile, staleTime: 60_000 });
}

export function useUpdateAccountProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAccountProfileInput) => updateAccountProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['users', 'me'], profile);
      useSessionStore.getState().setUser({ id: profile.id, name: profile.name, role: profile.role, permissions: profile.permissions });
    },
  });
}

export function useAccountAppointments(params: AppointmentListParams, enabled = true) {
  return useQuery({ queryKey: ['appointments', { scope: 'customer', ...params }], queryFn: () => getMyAppointments(params), enabled, staleTime: 30_000 });
}

interface UseAccountAppointmentProps {
  id: string;
  enabled?: boolean;
}

export const useAccountAppointment = (params: () => UseAccountAppointmentProps) => {
  const [store] = useState(
    () =>
      new MobxQuery({
        queryKey: ['appointments', { scope: 'customer' }],
      }),
  );

  const getResult = () => {
    const { id, enabled = true } = params();

    return store.query({
      queryKey: ['appointments', { scope: 'customer', id }],
      queryFn: () => getMyAppointment(id),
      enabled: enabled && /^\d+$/.test(id),
      staleTime: 15_000,
    });
  };

  return {
    get appointment() {
      return getResult().data;
    },

    get isLoading() {
      return getResult().isLoading;
    },

    get isPending() {
      return getResult().isPending;
    },

    get isFetching() {
      return getResult().isFetching;
    },

    get isError() {
      return getResult().isError;
    },

    get isSuccess() {
      return getResult().isSuccess;
    },

    get error() {
      return getResult().error;
    },

    refetch: () => getResult().refetch(),
  };
};

export function useAccountBarbers() {
  return useQuery({ queryKey: ['barbers', { scope: 'public-site' }], queryFn: getPublicBarbers, staleTime: 5 * 60 * 1000 });
}
