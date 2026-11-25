import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {getAccountProfile, updateAccountProfile, type UpdateAccountProfileInput} from '@/modules/account/api/profile'
import {getMyAppointment, getMyAppointments, type AppointmentListParams} from '@/modules/account/api/appointments'
import {getPublicBarbers} from '@/modules/site/api/barbers'
import {useSessionStore} from '@/shared/stores/session-store'

export function useAccountUser() {
  return useQuery({queryKey: ['users', 'me'], queryFn: getAccountProfile, staleTime: 60_000})
}

export function useUpdateAccountProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAccountProfileInput) => updateAccountProfile(input),
    onSuccess: profile => {
      queryClient.setQueryData(['users', 'me'], profile)
      useSessionStore.getState().setUser({id: profile.id, name: profile.name, role: profile.role, permissions: profile.permissions})
    }
  })
}

export function useAccountAppointments(params: AppointmentListParams, enabled = true) {
  return useQuery({queryKey: ['appointments', {scope: 'customer', ...params}], queryFn: () => getMyAppointments(params), enabled, staleTime: 30_000})
}

export function useAccountAppointment(id: string, enabled = true) {
  return useQuery({queryKey: ['appointments', {scope: 'customer', id}], queryFn: () => getMyAppointment(id), enabled: enabled && /^\d+$/.test(id), staleTime: 15_000})
}

export function useAccountBarbers() {
  return useQuery({queryKey: ['barbers', {scope: 'public-site'}], queryFn: getPublicBarbers, staleTime: 5 * 60 * 1000})
}
