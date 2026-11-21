import { StaffUser } from '@/modules/admin/users/api/team-users';
import { ExpandedUserId } from '@/modules/admin/users/components/expanded-user-id';
import { InviteStaffDialog } from '@/modules/admin/users/components/invite-staff-dialog';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { useCan } from '@/shared/hooks/use-can';
import { formatDateTime } from '@/shared/lib/format';
import { UserRole } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { Copy, MailPlus, ShieldCheck, UsersRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

import { useTeamUsersPage } from './useTeamUsersPage';

const roleLabels: Record<Exclude<UserRole, 'customer'>, string> = { barber: 'Barbeiro', reception: 'Recepção', manager: 'Gerente', admin: 'Administrador' };

export default function TeamUsersPage() {
  const canManage = useCan('team.manage');
  const { store, usersQuery, updateMutation, inviteMutation, setPermission, invite, copyInvite } = useTeamUsersPage();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Usuários e permissões"
        description="Convide pessoas, escolha o papel de acesso e ajuste permissões por módulo."
        actions={
          <Observer>
            {() => (
              <Button className="min-h-11 w-full sm:w-auto" disabled={!canManage} onClick={() => store.setInviteOpen(true)}>
                <MailPlus className="size-4" aria-hidden="true" /> Convidar
              </Button>
            )}
          </Observer>
        }
      />

      <Observer>
        {() => (
          <RenderComponent condition={store.inviteNotice}>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{store.inviteNotice?.url ? 'Convite criado; o e-mail não foi enviado' : 'Convite enviado por e-mail'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <RenderComponent condition={store.inviteNotice?.url}>{`Compartilhe o link abaixo com ${store.inviteNotice?.email}. Ele expira em 30 minutos.`}</RenderComponent>

                    <RenderComponent condition={!store.inviteNotice?.url}>{`Enviamos o link de definição de senha para ${store.inviteNotice?.email}.`}</RenderComponent>
                  </p>
                </div>

                <RenderComponent condition={store.inviteNotice?.url}>
                  <div className="flex w-full gap-2 sm:max-w-xl">
                    <Input readOnly value={store.inviteNotice?.url || ''} className="min-h-11" aria-label="Link de definição de senha" />
                    <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void copyInvite()}>
                      <Copy className="size-4" aria-hidden="true" /> Copiar
                    </Button>
                  </div>
                </RenderComponent>

                <Button type="button" variant="ghost" className="min-h-11" onClick={() => store.setInviteNotice(null)}>
                  Fechar
                </Button>
              </CardContent>
            </Card>
          </RenderComponent>
        )}
      </Observer>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <UsersRound className="size-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Equipe com acesso ao sistema</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Alterar um papel encerra as sessões atuais dessa pessoa.</p>
          </div>
        </CardHeader>
        <CardContent>
          <Observer>
            {() => (
              <RenderComponent condition={usersQuery.isError}>
                <ErrorState title="Não foi possível carregar os usuários" onRetry={() => void usersQuery.result.refetch()} />
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={usersQuery.isPending}>
                <div className="space-y-2" aria-label="Carregando usuários">
                  {[1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-14 rounded-lg" />
                  ))}
                </div>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={usersQuery.isSuccess}>
                <RenderComponent condition={usersQuery.users.length}>
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
                      {usersQuery.users.map((user: any) => {
                        const lastActiveAdmin = user.role === 'admin' && user.active && usersQuery.activeAdminCount === 1;
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
                                  const next = { ...store.permissionDrafts };
                                  delete next[user.id];

                                  store.setPermissionDrafts(next);
                                  updateMutation.mutate({ id: user.id, input: { role: role as StaffUser['role'] } });
                                }}
                                disabled={!canManage || updateMutation.isLoading || lastActiveAdmin}
                              >
                                <SelectTrigger className="min-h-10 w-40" aria-label={`Papel de ${user.email || user.name}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {usersQuery.roles.map((role) => (
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
                                variant={store.expandedUserId === user.id ? 'secondary' : 'outline'}
                                className="min-h-10"
                                onClick={() => store.setExpandedUserId(store.expandedUserId === user.id ? null : user.id)}
                              >
                                <ShieldCheck className="size-4" aria-hidden="true" />
                                {store.expandedUserId === user.id ? 'Fechar matriz' : 'Editar matriz'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </RenderComponent>

                <RenderComponent condition={usersQuery.users.length === 0}>
                  <EmptyState
                    title="Nenhum usuário da equipe"
                    description="Convide a primeira pessoa para acessar o painel."
                    icon={<UsersRound className="size-8" />}
                    actionLabel="Convidar"
                    onAction={() => store.setInviteOpen(true)}
                  />
                </RenderComponent>
              </RenderComponent>
            )}
          </Observer>
        </CardContent>
      </Card>

      <Observer>
        {() => (
          <RenderComponent condition={store.expandedUserId !== null}>
            <ExpandedUserId expandedUserId={store.expandedUserId} permissionDrafts={store.permissionDrafts} setPermission={setPermission} />
          </RenderComponent>
        )}
      </Observer>

      <Observer>{() => <InviteStaffDialog open={store.inviteOpen} pending={inviteMutation.isLoading} onOpenChange={store.setInviteOpen} onInvite={invite} />}</Observer>
    </div>
  );
}
