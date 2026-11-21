import {
    useInviteTeamUser, useTeamUsers, useUpdateTeamUser
} from '@/modules/admin/users/hooks/use-team-users';
import { InviteValues } from '@/modules/admin/users/schemas/invite.schema';

import { Permission } from '@/shared/types/domain';

import { useLocalObservable } from 'mobx-react-lite';
import { toast } from 'sonner';

type InviteNotice = { email: string; url: string | null } | null;

export const useTeamUsersPage = () => {
  const usersQuery = useTeamUsers();
  const inviteMutation = useInviteTeamUser();
  const updateMutation = useUpdateTeamUser();

  const store = useLocalObservable(() => ({
    inviteOpen: false,
    inviteNotice: null as InviteNotice,
    expandedUserId: null as number | null,
    permissionDrafts: {} as Record<number, Permission[]>,
    setInviteOpen: (value: boolean) => (store.inviteOpen = value),
    setInviteNotice: (value: InviteNotice) => (store.inviteNotice = value),
    setExpandedUserId: (value: number | null) => (store.expandedUserId = value),
    setPermissionDrafts: (value: Record<number, Permission[]>) => (store.permissionDrafts = value),
  }));

  async function copyInvite() {
    if (!store.inviteNotice?.url) return;
    try {
      await navigator.clipboard.writeText(store.inviteNotice.url);
      toast.success('Link de definição de senha copiado.');
    } catch {
      toast.error('Não foi possível copiar o link. Selecione e copie o endereço.');
    }
  }

  async function invite(values: InviteValues) {
    const result = await inviteMutation.mutateAsync(values);
    const url = result.data?.inviteToken ? `${window.location.origin}/redefinir-senha/${encodeURIComponent(result.data?.inviteToken)}` : null;
    store.setInviteNotice({ email: values.email, url });
    store.setInviteOpen(false);
  }

  function setPermission(userId: number, permission: Permission, checked: boolean) {
    const currentPermissions = store.permissionDrafts[userId] ?? [];

    store.setPermissionDrafts({ ...store.permissionDrafts, [userId]: checked ? [...new Set([...currentPermissions, permission])] : currentPermissions.filter((item) => item !== permission) });
  }

  return { store, usersQuery, updateMutation, inviteMutation, invite, copyInvite, setPermission };
};
