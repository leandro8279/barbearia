import React, { useEffect } from 'react';

import { useResetPasswordPage } from '@/modules/auth/hooks/use-reset-password-page';

import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

export default function ResetPasswordPage() {
  const store = useResetPasswordPage();

  useEffect(() => {
    document.title = 'Redefinir senha | Barbearia';
  }, []);

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={store.invalidToken}>
            <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
              <CardHeader className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso seguro</p>
                <CardTitle className="text-3xl font-semibold">Link inválido ou expirado</CardTitle>
                <CardDescription>Solicite um novo link para criar outra senha.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="h-11 w-full">
                  <Link href="/entrar?recuperar=1">Pedir outro link</Link>
                </Button>
                <Button asChild className="h-11 w-full" variant="outline">
                  <Link href="/entrar">Voltar para entrar</Link>
                </Button>
              </CardContent>
            </Card>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={!store.invalidToken}>
            <ResetPasswordContent store={store} />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}

function ResetPasswordContent({ store }: { store: ReturnType<typeof useResetPasswordPage> }) {
  return (
    <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso seguro</p>
        <CardTitle className="text-3xl font-semibold">Criar nova senha</CardTitle>
        <CardDescription>Escolha uma senha nova para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...store.form}>
          <form className="space-y-5" onSubmit={(event) => void store.handleSubmit(event)}>
            <input autoComplete="username" aria-hidden="true" className="sr-only" name="username" tabIndex={-1} type="text" />
            <FormField
              control={store.form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" autoFocus className="h-11" type="password" placeholder="Mínimo de 8 caracteres" />
                  </FormControl>

                  <Observer>
                    {() => (
                      <div
                        className="space-y-1.5"
                        role="meter"
                        aria-label="Força da senha"
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-valuenow={store.passwordStrength}
                        aria-valuetext={store.strengthValueText}
                      >
                        <div className="flex gap-1.5">
                          {store.strengthSegments.map(({ segment, active }) => (
                            <span key={segment} className={`h-1.5 flex-1 rounded-full ${active ? store.strengthColor : 'bg-muted'}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{store.strengthHint}</p>
                      </div>
                    )}
                  </Observer>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={store.form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" className="h-11" type="password" placeholder="Digite a senha novamente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Observer>
              {() => (
                <RenderComponent condition={store.serverError}>
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {store.serverError}
                  </p>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <Button className="h-11 w-full" type="submit" disabled={store.isSubmitting}>
                  {store.submitLabel}
                </Button>
              )}
            </Observer>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
