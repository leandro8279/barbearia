import { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, LoaderCircle, MailPlus, Save, ShieldCheck, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { InviteStaffDialog } from '@/modules/admin/users/components/invite-staff-dialog';
import { useInviteTeamUser, useTeamUsers, useUpdateTeamUser } from '@/modules/admin/users/hooks/use-team-users';
import type { Permission, UserRole } from '@/shared/types/domain';
import type { StaffUser } from '@/modules/admin/users/api/team-users';
import type { InviteValues } from '@/modules/admin/users/schemas/invite.schema';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatDateTime } from '@/shared/lib/format';
import { useCan } from '@/shared/hooks/use-can';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const roleLabels: Record<Exclude<UserRole, 'customer'>, string> = { barber: 'Barbeiro', reception: 'Recepção', manager: 'Gerente', admin: 'Administrador' };
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

export default function TeamUsersPage() {
  const canManage = useCan('team.manage');
  const usersQuery = useTeamUsers();
  const inviteMutation = useInviteTeamUser();
  const updateMutation = useUpdateTeamUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<number, Permission[]>>({});
  const [inviteNotice, setInviteNotice] = useState<{ email: string; url: string | null } | null>(null);
  const users = usersQuery.data?.users ?? [];
  const activeAdminCount = useMemo(() => users.filter((user) => user.role === 'admin' && user.active).length, [users]);

  useEffect(() => {
    document.title = 'Usuários e permissões | Painel administrativo';
  }, []);

  useEffect(() => {
    if (!usersQuery.data) return;
    setPermissionDrafts((current) => {
      const next = { ...current };
      for (const user of usersQuery.data.users) {
        if (next[user.id]) continue;
        const inherited = usersQuery.data.roleDefaults[user.role] ?? [];
        next[user.id] = usersQuery.data.permissionKeys.filter(
          (permission) => user.permissions.includes(permission) || (user.effectivePermissions.includes(permission) && !inherited.includes(permission)),
        );
      }
      return next;
    });
  }, [usersQuery.data]);

  async function invite(values: InviteValues) {
    const result = await inviteMutation.mutateAsync(values);
    const url = result.inviteToken ? `${window.location.origin}/redefinir-senha/${encodeURIComponent(result.inviteToken)}` : null;
    setInviteNotice({ email: values.email, url });
    setInviteOpen(false);
  }

  function setPermission(userId: number, permission: Permission, checked: boolean) {
    setPermissionDrafts((current) => {
      const currentPermissions = current[userId] ?? [];
      return { ...current, [userId]: checked ? [...new Set([...currentPermissions, permission])] : currentPermissions.filter((item) => item !== permission) };
    });
  }

  async function savePermissions(userId: number) {
    await updateMutation.mutateAsync({ id: userId, input: { permissions: permissionDrafts[userId] ?? [] } });
  }

  async function copyInvite() {
    if (!inviteNotice?.url) return;
    try {
      await navigator.clipboard.writeText(inviteNotice.url);
      toast.success('Link de definição de senha copiado.');
    } catch {
      toast.error('Não foi possível copiar o link. Selecione e copie o endereço.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Usuários e permissões"
        description="Convide pessoas, escolha o papel de acesso e ajuste permissões por módulo."
        actions={
          <Button className="min-h-11 w-full sm:w-auto" disabled={!canManage} onClick={() => setInviteOpen(true)}>
            <MailPlus className="size-4" aria-hidden="true" /> Convidar
          </Button>
        }
      />

      {inviteNotice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{inviteNotice.url ? 'Convite criado; o e-mail não foi enviado' : 'Convite enviado por e-mail'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {inviteNotice.url ? `Compartilhe o link abaixo com ${inviteNotice.email}. Ele expira em 30 minutos.` : `Enviamos o link de definição de senha para ${inviteNotice.email}.`}
              </p>
            </div>
            {inviteNotice.url && (
              <div className="flex w-full gap-2 sm:max-w-xl">
                <Input readOnly value={inviteNotice.url} className="min-h-11" aria-label="Link de definição de senha" />
                <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void copyInvite()}>
                  <Copy className="size-4" aria-hidden="true" /> Copiar
                </Button>
              </div>
            )}
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setInviteNotice(null)}>
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <UsersRound className="size-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Equipe com acesso ao sistema</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Alterar um papel encerra as sessões atuais dessa pessoa.</p>
          </div>
        </CardHeader>
        <CardContent>
          {usersQuery.isError ?
            <ErrorState title="Não foi possível carregar os usuários" onRetry={() => void usersQuery.refetch()} />
          : usersQuery.isPending ?
            <div className="space-y-2" aria-label="Carregando usuários">
              {[1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-14 rounded-lg" />
              ))}
            </div>
          : users.length ?
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Permissões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const lastActiveAdmin = user.role === 'admin' && user.active && activeAdminCount === 1;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email || 'Sem e-mail'}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(role) => {
                            setPermissionDrafts((current) => {
                              const next = { ...current };
                              delete next[user.id];
                              return next;
                            });
                            updateMutation.mutate({ id: user.id, input: { role: role as StaffUser['role'] } });
                          }}
                          disabled={!canManage || updateMutation.isPending || lastActiveAdmin}
                        >
                          <SelectTrigger className="min-h-10 w-40" aria-label={`Papel de ${user.email || user.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(usersQuery.data?.roles ?? []).map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {lastActiveAdmin && <p className="mt-1 text-xs text-muted-foreground">Último administrador ativo</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={user.active ? 'default' : 'secondary'}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
                          {!user.hasPassword && <Badge variant="outline">Convite pendente</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.lastAccessAt ? formatDateTime(user.lastAccessAt) : 'Nunca acessou'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant={expandedUserId === user.id ? 'secondary' : 'outline'}
                          className="min-h-10"
                          onClick={() => setExpandedUserId((current) => (current === user.id ? null : user.id))}
                        >
                          <ShieldCheck className="size-4" aria-hidden="true" />
                          {expandedUserId === user.id ? 'Fechar matriz' : 'Editar matriz'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          : <EmptyState
              title="Nenhum usuário da equipe"
              description="Convide a primeira pessoa para acessar o painel."
              icon={<UsersRound className="size-8" />}
              actionLabel="Convidar"
              onAction={() => setInviteOpen(true)}
            />
          }
        </CardContent>
      </Card>

      {expandedUserId !== null &&
        (() => {
          const user = users.find((item) => item.id === expandedUserId);
          if (!user) return null;
          const defaults = usersQuery.data?.roleDefaults[user.role] ?? [];
          const draft = permissionDrafts[user.id] ?? [];
          const dirty =
            usersQuery.data?.permissionKeys.some((permission) => {
              const wasGranted = user.effectivePermissions.includes(permission) && !defaults.includes(permission);
              return wasGranted !== draft.includes(permission);
            }) ?? false;
          return (
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-5 text-primary" aria-hidden="true" /> Permissões de {user.name || user.email}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Permissões herdadas do papel ficam bloqueadas. Ajustes diretos são registrados na auditoria.</p>
                </div>
                <Button type="button" className="min-h-11" disabled={!canManage || !dirty || updateMutation.isPending} onClick={() => void savePermissions(user.id)}>
                  {updateMutation.isPending ?
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  : <Save className="size-4" aria-hidden="true" />}
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
        })()}

      <InviteStaffDialog open={inviteOpen} pending={inviteMutation.isPending} onOpenChange={setInviteOpen} onInvite={invite} />
    </div>
  );
}
