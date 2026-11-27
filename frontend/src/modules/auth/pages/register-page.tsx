import { useEffect } from 'react';

import { useRegisterPage } from '@/modules/auth/hooks/use-register-page';

import { PhoneInput } from '@/shared/components/phone-input';
import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

export default function RegisterPage() {
  const store = useRegisterPage();

  useEffect(() => {
    document.title = 'Criar conta | Barbearia';
  }, []);

  return (
    <Card className="auth-login-texture border-border/80 bg-card shadow-panel">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Crie seu acesso</p>
        <CardTitle className="text-3xl font-semibold sm:text-4xl">Criar conta</CardTitle>
        <CardDescription>Cadastre seus dados para acompanhar seus horários e preferências.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...store.form}>
          <form className="space-y-5" onSubmit={(event) => store.handleSubmit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={store.form.control}
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
                control={store.form.control}
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
                control={store.form.control}
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
                control={store.form.control}
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
              control={store.form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" className="h-11" type="password" placeholder="Mínimo de 8 caracteres" />
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
                        aria-valuetext={store.strengthAriaText}
                      >
                        <div className="flex gap-1.5">
                          {store.strengthSegments.map((segment) => (
                            <span key={segment.id} className={segment.className} />
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
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="new-password" className="h-11" type="password" placeholder="Digite a senha novamente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={store.form.control}
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
              control={store.form.control}
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
