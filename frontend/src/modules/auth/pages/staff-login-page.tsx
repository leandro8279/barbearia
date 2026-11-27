import { useEffect } from 'react';

import { useStaffLoginPage } from '@/modules/auth/hooks/use-staff-login-page';

import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

export default function StaffLoginPage() {
  const store = useStaffLoginPage();

  useEffect(() => {
    document.title = 'Login da equipe | Barbearia';
  }, []);

  return (
    <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso restrito</p>
        <CardTitle className="text-3xl font-semibold sm:text-4xl">Entrar na equipe</CardTitle>
        <CardDescription>Use seu e-mail de trabalho e senha para acessar o painel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Form {...store.form}>
          <form className="space-y-5" onSubmit={(event) => void store.handleSubmit(event)}>
            <FormField
              control={store.form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="username" autoFocus className="h-11" placeholder="voce@barbearia.com" type="email" />
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
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="current-password" className="h-11" placeholder="Sua senha" type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={store.form.control}
              name="rememberOnDevice"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="cursor-pointer leading-relaxed">Manter conectado neste aparelho</FormLabel>
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

        <RenderComponent condition={import.meta.env.DEV}>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Contas de demonstração (desenvolvimento)</p>
            <p className="mt-1 text-muted-foreground">admin@barbearia.test · gerente@barbearia.test · recepcao@barbearia.test · rafael@barbearia.test</p>
            <p className="mt-1 text-muted-foreground">Senha: Barbearia@123</p>
          </div>
        </RenderComponent>

        <p className="text-center text-sm text-muted-foreground">
          Acesso de cliente?{' '}
          <Link href="/entrar" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            Entrar na minha conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
