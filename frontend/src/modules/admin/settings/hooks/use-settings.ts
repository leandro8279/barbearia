import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {
  getBookingRules,
  getBusinessHours,
  getBusinessSettings,
  getNotificationSettings,
  markNotificationSent,
  resendNotification,
  saveBookingRules,
  saveBusinessHours,
  saveBusinessSettings,
  saveNotificationSettings
} from '@/modules/admin/settings/api/settings'
import type {BookingRules, BusinessFormValues, BusinessHourDay, BusinessHoliday, NotificationConfig, NotificationTemplates} from '@/modules/admin/settings/api/settings'
import {HttpError} from '@/shared/lib/http'

export function useBusinessSettings() {
  return useQuery({queryKey: ['admin-settings-business'], queryFn: getBusinessSettings})
}

export function useSaveBusinessSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BusinessFormValues) => saveBusinessSettings(input),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({queryKey: ['admin-settings-business']}), queryClient.invalidateQueries({queryKey: ['unit']})])
      toast.success('Dados do negócio salvos.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar os dados do negócio.')
  })
}

export function useBusinessHours() {
  return useQuery({queryKey: ['admin-settings-hours'], queryFn: getBusinessHours})
}

export function useSaveBusinessHours() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {businessHours: BusinessHourDay[]; holidays: BusinessHoliday[]; confirmAffected?: boolean}) => saveBusinessHours(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-settings-hours']}),
        queryClient.invalidateQueries({queryKey: ['admin-agenda-availability']}),
        queryClient.invalidateQueries({queryKey: ['unit']})
      ])
      toast.success('Horários e feriados salvos.')
    },
    onError: error => {
      if (!(error instanceof HttpError && error.status === 409)) toast.error(error instanceof Error ? error.message : 'Não foi possível salvar os horários.')
    }
  })
}

export function useBookingRules() {
  return useQuery({queryKey: ['admin-settings-booking'], queryFn: getBookingRules})
}

export function useSaveBookingRules() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BookingRules) => saveBookingRules(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['admin-settings-booking']})
      toast.success('Regras de agendamento salvas. Elas valem para novos horários.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar as regras.')
  })
}

export function useNotificationSettings() {
  return useQuery({queryKey: ['admin-settings-notifications'], queryFn: getNotificationSettings})
}

export function useSaveNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NotificationConfig & {templates: NotificationTemplates}) => saveNotificationSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['admin-settings-notifications']})
      toast.success('Notificações e lembretes salvos.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar as notificações.')
  })
}

export function useResendNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resendNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['admin-settings-notifications']})
      toast.success('Novo registro criado. Abra o link para enviar a mensagem.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível preparar o reenvio.')
  })
}

export function useMarkNotificationSent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationSent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['admin-settings-notifications']})
      toast.success('Envio registrado no log.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível registrar o envio.')
  })
}
