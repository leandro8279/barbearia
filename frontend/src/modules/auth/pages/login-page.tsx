import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { ForgotPasswordDialog } from '@/modules/auth/components/forgot-password-dialog';
import { useLoginMutation } from '@/modules/auth/hooks/use-login';
import { LoginFormValues, loginSchema } from '@/modules/auth/schemas/login.schema';

import { RenderComponent } from '@/shared/components/render-component';
import { useOverlay } from '@/shared/hooks/use-overlay';
import { HttpError } from '@/shared/lib/http';
import { UserRole } from '@/shared/types/domain';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Observer, useLocalObservable } from 'mobx-react-lite';
import { Link, useLocation, useSearch } from 'wouter';

function destinationForRole(role: UserRole, search: string) {
  if (role !== 'customer') return '/admin';

  const next = new URLSearchParams(search).get('next');
  if (next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next;
  return '/conta';
}

function loginErrorMessage(error: unknown) {
  if (error instanceof HttpError && error.status === 401) return 'E-mail/telefone ou senha inválidos.';
  return 'Não foi possível entrar agora. Tente novamente.';
}

export default function LoginPage() {
  const search = useSearch();
  const login = useLoginMutation();
  const [, setLocation] = useLocation();
  const recoveryOverlay = useOverlay('recuperar');
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: 'cliente01@email.test', password: 'Barbearia@123' },
  });

  const store = useLocalObservable(() => ({
    showPassword: false,
    setShowPassword(value: boolean) {
      this.showPassword = value;
    },
  }));

  useEffect(() => {
    document.title = `${recoveryOverlay.isOpen ? 'Recuperar senha' : 'Entrar'} | Barbearia`;
  }, [recoveryOverlay.isOpen]);

  function onSubmit(values: LoginFormValues) {
    form.clearErrors('root.server');
    login.mutate(values, {
      onSuccess: (data) => setLocation(destinationForRole(data.user.role, search)),
      onError: (error) => form.setError('root.server', { type: 'server', message: loginErrorMessage(error) }),
    });
  }

  return (
    <React.Fragment>
      <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso à sua conta</p>
          <CardTitle className="text-3xl font-semibold sm:text-4xl">Entrar</CardTitle>
          <CardDescription>Use seu e-mail ou telefone para acompanhar seus horários.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail ou telefone</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="username" autoFocus placeholder="Seu e-mail ou telefone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <Observer>
                    {() => (
                      <FormItem>
                        <span className="flex items-center justify-between gap-3">
                          <FormLabel>Senha</FormLabel>
                          <Link href="/entrar?recuperar=1" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
                            Esqueci a senha
                          </Link>
                        </span>

                        <FormControl>
                          <Input
                            {...field}
                            className="h-11 pr-12"
                            autoComplete="current-password"
                            type={store.showPassword ? 'text' : 'password'}
                            placeholder="Sua senha"
                          />
                        </FormControl>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-pressed={store.showPassword}
                          className="absolute right-1 top-1 size-11"
                          onClick={() => store.setShowPassword(!store.showPassword)}
                          aria-label={store.showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          <RenderComponent condition={store.showPassword}>
                            <EyeOff aria-hidden="true" />
                          </RenderComponent>

                          <RenderComponent condition={!store.showPassword}>
                            <Eye aria-hidden="true" />
                          </RenderComponent>
                        </Button>

                        <FormMessage />
                      </FormItem>
                    )}
                  </Observer>
                )}
              />

              <RenderComponent condition={form.formState.errors.root?.server}>
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {form.formState.errors.root?.server?.message}
                </p>
              </RenderComponent>

              <Observer>
                {() => (
                  <Button className="h-11 w-full" type="submit" disabled={login.isLoading}>
                    <RenderComponent condition={login.isLoading}>
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    </RenderComponent>
                    {login.isLoading ? 'Entrando…' : 'Entrar'}
                  </Button>
                )}
              </Observer>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link href="/cadastrar" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>

          <div className="relative flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button asChild className="h-11 w-full" variant="outline">
            <Link href="/agendar">Agendar sem conta</Link>
          </Button>
        </CardContent>
      </Card>
      <ForgotPasswordDialog open={recoveryOverlay.isOpen} onOpenChange={(open) => recoveryOverlay.setOpen(open)} />
    </React.Fragment>
  );
}
