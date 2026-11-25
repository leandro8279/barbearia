import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'wouter';
import { register } from '@/modules/auth/api/auth';
import { registerSchema, type RegisterFormValues } from '@/modules/auth/schemas/register.schema';
import { PhoneInput } from '@/shared/components/phone-input';
import { HttpError } from '@/shared/lib/http';
import { useSessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

function getPasswordStrength(password: string) {
  if (!password) return 0;
  return [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(Boolean).length;
}

function getRegistrationError(error: unknown) {
  if (error instanceof HttpError && typeof error.details === 'object' && error.details !== null && 'error' in error.details && typeof error.details.error === 'string') {
    return error.details.error;
  }
  return 'Não foi possível criar sua conta. Confira os dados e tente novamente.';
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const setSession = useSessionStore((state) => state.setSession);
  const mutation = useMutation({ mutationFn: register });
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', birthDate: '', password: '', confirmPassword: '', termsAccepted: false, reminders: false },
  });
  const password = form.watch('password');
  const passwordStrength = getPasswordStrength(password);
  const strengthLabel = ['', 'Fraca', 'Média', 'Boa', 'Forte'][passwordStrength];
  const strengthColor =
    passwordStrength === 1 ? 'bg-destructive'
    : passwordStrength === 2 ? 'bg-orange-500'
    : passwordStrength === 3 ? 'bg-amber-400'
    : 'bg-emerald-500';

  useEffect(() => {
    document.title = 'Criar conta | Barbearia';
  }, []);

  async function onSubmit(values: RegisterFormValues) {
    form.clearErrors('root.server');
    try {
      const result = await mutation.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        birthDate: values.birthDate || null,
        reminders: values.reminders,
        termsAccepted: values.termsAccepted,
      });
      setSession(result.user, result.token);
      setLocation('/conta');
    } catch (error) {
      const message = getRegistrationError(error);
      if (error instanceof HttpError && error.status === 409) {
        if (message.toLowerCase().includes('e-mail')) {
          form.setError('email', { type: 'server', message });
          return;
        }
        if (message.toLowerCase().includes('telefone')) {
          form.setError('phone', { type: 'server', message });
          return;
        }
      }
      form.setError('root.server', { type: 'server', message });
    }
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Crie seu acesso</p>
        <CardTitle className="text-3xl font-semibold sm:text-4xl">Criar conta</CardTitle>
        <CardDescription>Cadastre seus dados para acompanhar seus horários e preferências.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" autoFocus className="h-11" placeholder="Seu nome" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="email" className="h-11" placeholder="voce@email.com" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="register-phone">Telefone/WhatsApp</FormLabel>
                    <PhoneInput id="register-phone" value={field.value} onValueChange={field.onChange} name={field.name} aria-label="Telefone ou WhatsApp com DDD" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de nascimento (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="bday" className="h-11" max={new Date().toISOString().slice(0, 10)} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" className="h-11" type="password" placeholder="Mínimo de 8 caracteres" />
                  </FormControl>
                  <div
                    className="space-y-1.5"
                    role="meter"
                    aria-label="Força da senha"
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-valuenow={passwordStrength}
                    aria-valuetext={strengthLabel || 'Sem senha'}
                  >
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((segment) => (
                        <span key={segment} className={`h-1.5 flex-1 rounded-full ${segment < passwordStrength ? strengthColor : 'bg-muted'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{password ? `Força da senha: ${strengthLabel.toLowerCase()}` : 'Use letras, números e símbolos para uma senha mais forte.'}</p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" className="h-11" type="password" placeholder="Digite a senha novamente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border border-border p-3">
                  <FormControl>
                    <Checkbox className="mt-1 size-5" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="cursor-pointer leading-relaxed">Li e aceito os termos de uso e a política de privacidade.</FormLabel>
                  <FormMessage className="col-span-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminders"
              render={({ field }) => (
                <FormItem className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border border-border p-3">
                  <FormControl>
                    <Checkbox className="mt-1 size-5" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="cursor-pointer leading-relaxed">Quero receber lembretes pelo WhatsApp.</FormLabel>
                    <FormDescription>Opcional. Você pode mudar essa preferência depois.</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.formState.errors.root?.server && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {form.formState.errors.root.server.message}
              </p>
            )}

            <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando conta…' : 'Criar conta'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/entrar" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
