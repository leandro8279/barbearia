import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { requestPasswordReset } from '@/modules/auth/api/auth';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/modules/auth/schemas/forgot-password.schema';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [sent, setSent] = useState(false);
  const mutation = useMutation({ mutationFn: requestPasswordReset });
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  useEffect(() => {
    if (!open) return;
    form.reset();
    form.clearErrors();
    setSent(false);
  }, [form, open]);

  async function onSubmit(values: ForgotPasswordValues) {
    form.clearErrors('root.server');
    try {
      await mutation.mutateAsync(values.email);
      setSent(true);
    } catch {
      form.setError('root.server', { type: 'server', message: 'Não foi possível processar sua solicitação agora. Tente novamente.' });
    }
  }

  const isPending = form.formState.isSubmitting || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-login-texture border-border/80 bg-card sm:max-w-md" showCloseButton={false}>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 size-11" aria-label="Fechar">
            <X aria-hidden="true" />
          </Button>
        </DialogClose>

        {sent ?
          <>
            <DialogHeader className="items-center pt-3">
              <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
              <DialogTitle>Confira seu e-mail</DialogTitle>
              <DialogDescription>Se houver uma conta com esse endereço, enviaremos instruções para redefinir sua senha.</DialogDescription>
            </DialogHeader>
            <Button className="mt-2 h-11 w-full" onClick={() => onOpenChange(false)}>
              Voltar para entrar
            </Button>
          </>
        : <>
            <DialogHeader className="pr-8">
              <DialogTitle>Recuperar senha</DialogTitle>
              <DialogDescription>Informe o e-mail associado à sua conta. Enviaremos instruções se encontrarmos um cadastro.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="email" autoFocus className="h-11" placeholder="voce@email.com" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root?.server && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {form.formState.errors.root.server.message}
                  </p>
                )}
                <Button className="h-11 w-full" type="submit" disabled={isPending}>
                  {isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {isPending ? 'Enviando…' : 'Enviar instruções'}
                </Button>
              </form>
            </Form>
          </>
        }
      </DialogContent>
    </Dialog>
  );
}
