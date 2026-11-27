import { useEffect } from 'react';

import { ForgotPasswordDialog } from '@/modules/auth/components/forgot-password-dialog';
import { useLoginPage } from '@/modules/auth/hooks/use-login-page';

import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

export default function LoginPage() {
  const store = useLoginPage();
  const documentTitle = store.documentTitle;

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return (
    <>
      <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso à sua conta</p>
          <CardTitle className="text-3xl font-semibold sm:text-4xl">Entrar</CardTitle>
          <CardDescription>Use seu e-mail ou telefone para acompanhar seus horários.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Observer>
            {() => (
              <Form {...store.form}>
                <form className="space-y-5" onSubmit={(event) => void store.handleSubmit(event)}>
                  <FormField
                    control={store.form.control}
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
                    control={store.form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-3">
                          <FormLabel>Senha</FormLabel>
                          <Link href="/entrar?recuperar=1" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
                            Esqueci a senha
                          </Link>
                        </div>
                        <div className="relative">
                          <FormControl>
                            <Input {...field} autoComplete="current-password" className="h-11 pr-12" type={store.passwordInputType} placeholder="Sua senha" />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 size-11"
                            aria-label={store.passwordToggleLabel}
                            aria-pressed={store.showPassword}
                            onClick={() => store.togglePassword()}
                          >
                            <RenderComponent condition={store.showPassword}>
                              <EyeOff aria-hidden="true" />
                            </RenderComponent>

                            <RenderComponent condition={!store.showPassword}>
                              <Eye aria-hidden="true" />
                            </RenderComponent>
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <RenderComponent condition={store.serverError}>
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                      {store.serverError}
                    </p>
                  </RenderComponent>

                  <Button className="h-11 w-full" type="submit" disabled={store.isSubmitting}>
                    {store.isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                    {store.submitLabel}
                  </Button>
                </form>
              </Form>
            )}
          </Observer>

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

      <Observer>{() => <ForgotPasswordDialog open={store.isRecoveryOpen} onOpenChange={(open) => store.setRecoveryOpen(open)} />}</Observer>
    </>
  );
}
