import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
    getTeamUsers, inviteTeamUser, StaffUserUpdate, updateTeamUser
} from '@/modules/admin/users/api/team-users';

import { MobxMutation } from '@/shared/lib/mutation';
import { MobxQuery } from '@/shared/lib/query';

import { toast } from 'sonner';

export const useTeamUsers = () => {
  const [state] = useState(
    () =>
      new MobxQuery({
        queryFn: getTeamUsers,
        queryKey: ['admin-team-users'],
      }),
  );

  return {
    get result() {
      return state.query();
    },
    get isSuccess() {
      return this.result.isSuccess;
    },
    get isPending() {
      return this.result.isPending;
    },
    get isError() {
      return this.result.isError;
    },
    get users() {
      return this.result.data?.users || [];
    },
    get roles() {
      return this.result.data?.roles || [];
    },
    get roleDefaults() {
      return this.result.data?.roleDefaults;
    },
    get permissionKeys() {
      return this.result.data?.permissionKeys || [];
    },
    get activeAdminCount() {
      return this.users.filter((user) => user.role === 'admin' && user.active).length;
    },
  };
};

export const useUpdateTeamUser = () => {
  const queryClient = useQueryClient();

  const [store] = useState(
    () =>
      new MobxMutation({
        mutationFn: ({ id, input }: { id: number; input: StaffUserUpdate }) => updateTeamUser(id, input),
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['admin-team-users'] });
          toast.success('Acesso da equipe atualizado.');
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.'),
      }),
  );
  return store;
};

export const useInviteTeamUser = () => {
  const queryClient = useQueryClient();
  const [store] = useState(
    () =>
      new MobxMutation({
        mutationFn: inviteTeamUser,
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['admin-team-users'] });
          toast.success('Convite da equipe criado.');
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível convidar este usuário.'),
      }),
  );
  return store;
};
