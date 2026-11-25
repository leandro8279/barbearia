import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {getTeamUsers, inviteTeamUser, updateTeamUser, type StaffUserUpdate} from '@/modules/admin/users/api/team-users'

export function useTeamUsers() {
  return useQuery({queryKey: ['admin-team-users'], queryFn: getTeamUsers})
}

export function useInviteTeamUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inviteTeamUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['admin-team-users']})
      toast.success('Convite da equipe criado.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível convidar este usuário.')
  })
}

export function useUpdateTeamUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, input}: {id: number; input: StaffUserUpdate}) => updateTeamUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['admin-team-users']})
      toast.success('Acesso da equipe atualizado.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.')
  })
}
