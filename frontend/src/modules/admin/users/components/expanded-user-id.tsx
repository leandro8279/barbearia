import { useTeamUsers, useUpdateTeamUser } from '@/modules/admin/users/hooks/use-team-users';

import { RenderComponent } from '@/shared/components/render-component';
import { useCan } from '@/shared/hooks/use-can';
import { Permission } from '@/shared/types/domain';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';

import { KeyRound, LoaderCircle, Save } from 'lucide-react';
import { observer } from 'mobx-react-lite';

interface Props {
  expandedUserId: number | null;
  permissionDrafts: Record<number, Permission[]>;
  setPermission: (userId: number, permission: Permission, checked: boolean) => void;
}

const permissionGroups: Array<{ title: string; items: Array<{ key: Permission; label: string }> }> = [
  {
    title: 'Agenda',
    items: [
      { key: 'agenda.read', label: 'Consultar' },
      { key: 'agenda.write', label: 'Editar' },
      { key: 'agenda.manage', label: 'Gerenciar' },
    ],
  },
  { title: 'Comissões', items: [{ key: 'commissions.read', label: 'Consultar' }] },
  {
    title: 'Caixa',
    items: [
      { key: 'cash.read', label: 'Consultar' },
      { key: 'cash.write', label: 'Operar' },
      { key: 'cash.manage', label: 'Gerenciar' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { key: 'catalog.read', label: 'Consultar' },
      { key: 'catalog.write', label: 'Editar' },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { key: 'customers.read', label: 'Consultar' },
      { key: 'customers.write', label: 'Editar' },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { key: 'team.read', label: 'Consultar' },
      { key: 'team.write', label: 'Editar' },
      { key: 'team.manage', label: 'Gerenciar' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { key: 'finance.read', label: 'Consultar' },
      { key: 'finance.write', label: 'Editar despesas' },
      { key: 'finance.manage', label: 'Editar despesas pagas' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { key: 'settings.read', label: 'Consultar' },
      { key: 'settings.write', label: 'Editar' },
      { key: 'settings.manage', label: 'Gerenciar' },
    ],
  },
];

export const ExpandedUserId = observer(({ expandedUserId, permissionDrafts, setPermission }: Props) => {
  const usersQuery = useTeamUsers();
  const canManage = useCan('team.manage');
  const updateMutation = useUpdateTeamUser();

  const user = usersQuery.users.find((item) => item.id === expandedUserId);

  if (!user) return null;

  const defaults = usersQuery.roleDefaults?.[user.role] ?? [];
  const draft = permissionDrafts[user.id] ?? [];

  const dirty =
    usersQuery.permissionKeys.some((permission) => {
      const wasGranted = user.effectivePermissions.includes(permission) && !defaults.includes(permission);
      return wasGranted !== draft.includes(permission);
    }) ?? false;

  function savePermissions(userId: number) {
    updateMutation.mutate({ id: userId, input: { permissions: permissionDrafts[userId] ?? [] } });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden="true" /> Permissões de {user.name || user.email}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Permissões herdadas do papel ficam bloqueadas. Ajustes diretos são registrados na auditoria.</p>
        </div>
        <Button type="button" className="min-h-11" disabled={!canManage || !dirty || updateMutation.isLoading} onClick={() => void savePermissions(user.id)}>
          <RenderComponent condition={updateMutation.isLoading}>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          </RenderComponent>
          <RenderComponent condition={!updateMutation.isLoading}>
            <Save className="size-4" aria-hidden="true" />
          </RenderComponent>
          Salvar permissões
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {permissionGroups.map((group) => (
          <section key={group.title} className="rounded-lg border border-border p-4" aria-label={`Permissões de ${group.title}`}>
            <h3 className="font-semibold">{group.title}</h3>
            <div className="mt-3 space-y-2">
              {group.items.map((item) => {
                const inherited = defaults.includes(item.key);
                const checked = inherited || draft.includes(item.key);
                return (
                  <label key={item.key} className="flex min-h-10 items-center justify-between gap-3 text-sm">
                    <span>{item.label}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {inherited ? 'Do papel' : 'Extra'}
                      <Checkbox
                        checked={checked}
                        disabled={!canManage || inherited}
                        onCheckedChange={(value) => setPermission(user.id, item.key, value === true)}
                        aria-label={`${item.label} em ${group.title}`}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
});
