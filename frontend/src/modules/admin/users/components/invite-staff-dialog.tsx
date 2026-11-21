import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { StaffRole } from '@/modules/admin/users/api/team-users';
import { inviteSchema, InviteValues } from '@/modules/admin/users/schemas/invite.schema';

import { RenderComponent } from '@/shared/components/render-component';
import { UserRole } from '@/shared/types/domain';
import { Button } from '@/shared/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

import { LoaderCircle } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

interface Props {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (values: InviteValues) => Promise<void>;
}

const roleLabels: Record<Exclude<UserRole, 'customer'>, string> = { barber: 'Barbeiro', reception: 'Recepção', manager: 'Gerente', admin: 'Administrador' };

export function InviteStaffDialog(props: Props) {
  const { onInvite, onOpenChange, open, pending } = props;
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '', role: 'reception' } });

  useEffect(() => {
    if (!open) form.reset({ email: '', role: 'reception' });
  }, [form, open]);

  async function submit(values: InviteValues) {
    try {
      await onInvite(values);
    } catch (error) {
      form.setError('root.server', { message: error instanceof Error ? error.message : 'Não foi possível criar o convite.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar usuário da equipe</DialogTitle>
          <DialogDescription>O convite envia um link de definição de senha válido por 30 minutos.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" autoComplete="email" className="min-h-11" placeholder="nome@exemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(roleLabels) as StaffRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RenderComponent condition={form.formState.errors.root?.server}>
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root?.server?.message}
              </p>
            </RenderComponent>

            <Observer>
              {() => (
                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={pending}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="min-h-11" disabled={pending}>
                    <RenderComponent condition={pending}>
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    </RenderComponent>
                    Enviar convite
                  </Button>
                </DialogFooter>
              )}
            </Observer>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
