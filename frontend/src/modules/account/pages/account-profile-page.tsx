import React, { useEffect, useId, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { AccountAddressDrawer } from '@/modules/account/components/account-address-drawer';
import { useAccountProfilePage } from '@/modules/account/hooks/use-account-profile-page';
import { accountProfileSchema, AccountProfileValues } from '@/modules/account/schemas/account-profile.schema';

import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { formatCPF, formatPhone } from '@/shared/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import { Camera, MapPin, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

function initials(name?: string | null) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AccountProfilePage() {
  const store = useAccountProfilePage();
  const form = useForm<AccountProfileValues>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: { name: '', email: '', originalEmail: '', phone: '', cpf: '', birthDate: '', currentPassword: '' },
  });

  useEffect(() => {
    document.title = 'Meu perfil | Barbearia';
  }, []);

  useEffect(() => {
    document.title = 'Meu perfil | Barbearia';
  }, []);

  useEffect(() => store.bindForm(form), [store, form]);

  const header = <PageHeader eyebrow="Minha conta" title="Meu perfil" description="Mantenha seus dados e endereços atualizados." />;

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={store.isPending}>
            <div className="space-y-6">
              {header}
              <Skeleton className="h-40 rounded-xl" aria-label="Carregando seus dados" />
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-52 rounded-xl" />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isError || !store.profile}>
            <div className="space-y-6">
              {header}
              <ErrorState title="Não foi possível carregar seu perfil" description="Confira sua conexão e tente novamente." onRetry={() => store.refetch()} />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isSuccess}>
            <AccountProfilePageContent store={store} header={header} form={form} />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}

function AccountProfilePageContent({ store, header, form }: { form: any; header: React.JSX.Element; store: ReturnType<typeof useAccountProfilePage> }) {
  const inputId = useId();
  const photoInput = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {header}

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Observer>
              {() => (
                <Avatar size="lg" className="size-20 border border-border">
                  <AvatarImage src={store.profile?.avatar ?? undefined} alt={`Foto de ${store.profile?.name}`} />
                  <AvatarFallback className="text-xl">{initials(store.profile?.name) || <UserRound aria-hidden="true" />}</AvatarFallback>
                </Avatar>
              )}
            </Observer>
            <div>
              <Observer>{() => <p className="font-semibold">{store.profile?.name}</p>}</Observer>
              <p className="text-sm text-muted-foreground">Foto de perfil</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Observer>
              {() => (
                <input
                  id={inputId}
                  ref={photoInput}
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Escolher foto de perfil"
                  disabled={store.isSaving}
                  onChange={(event) => {
                    void store.updateAvatar(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              )}
            </Observer>

            <Observer>
              {() => (
                <Button type="button" variant="outline" className="min-h-11" disabled={store.isSaving} onClick={() => photoInput.current?.click()}>
                  <Camera aria-hidden="true" />
                  Alterar foto
                </Button>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.profile?.avatar}>
                  <Button type="button" variant="ghost" className="min-h-11" disabled={store.isSaving} onClick={() => void store.removeAvatar()}>
                    Remover
                  </Button>
                </RenderComponent>
              )}
            </Observer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Seus dados são usados para identificar e confirmar seus agendamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit((values: any) => store.submitProfile(values))}>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="name" className="min-h-11" />
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
                        <Input {...field} autoComplete="email" type="email" className="min-h-11" />
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
                      <FormLabel>Telefone / WhatsApp</FormLabel>
                      <FormControl>
                        <Input
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          maxLength={15}
                          className="min-h-11"
                          aria-label="Telefone com DDD"
                          value={formatPhone(field.value)}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value
                                .replace(/\D/g, '')
                                .replace(/^55(?=\d{10,11}$)/, '')
                                .slice(0, 11),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de nascimento</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" autoComplete="bday" className="min-h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="000.000.000-00"
                          className="min-h-11"
                          value={formatCPF(field.value)}
                          onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 11))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Observer>
                  {() => {
                    const emailChanged = store.isEmailChanged(form.watch('email'), form.watch('originalEmail'));

                    return (
                      <RenderComponent condition={emailChanged}>
                        <FormField
                          control={form.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Senha atual</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" autoComplete="current-password" className="min-h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </RenderComponent>
                    );
                  }}
                </Observer>
              </div>

              <RenderComponent condition={form.formState.errors.root?.server}>
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.server.message}
                </p>
              </RenderComponent>

              <div className="flex justify-end border-t border-border pt-4">
                <Observer>
                  {() => (
                    <Button type="submit" className="min-h-11" disabled={store.isSaving}>
                      {store.isSaving ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  )}
                </Observer>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Meus endereços</CardTitle>
            <CardDescription>Endereços salvos para facilitar sua experiência.</CardDescription>
          </div>

          <Observer>
            {() => (
              <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={store.isSaving} onClick={() => store.startAddressEdit()}>
                <Plus aria-hidden="true" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            )}
          </Observer>
        </CardHeader>
        <CardContent>
          <Observer>
            {() => (
              <RenderComponent condition={store.addressItems.length}>
                <ul className="space-y-3">
                  {store.addressItems.map((item) => (
                    <li key={item.address.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-medium">{item.address.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.address.street}, {item.address.number}
                            {item.address.complement ? ` · ${item.address.complement}` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.address.neighborhood} · {item.address.city}/{item.address.state} · CEP {item.address.zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                          </p>
                          {item.address.reference && <p className="mt-1 text-sm text-muted-foreground">Referência: {item.address.reference}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:justify-end">
                        <Button type="button" variant="outline" className="min-h-11" disabled={store.isSaving} onClick={() => store.startAddressEdit(item.address)}>
                          <Pencil aria-hidden="true" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={store.isSaving}
                          aria-label={`Remover endereço ${item.address.label}`}
                          onClick={() => void store.removeAddress(item.address)}
                          className="min-h-11 text-destructive hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={!store.addressItems.length}>
                <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                  <MapPin className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 font-medium">Nenhum endereço salvo</p>
                  <p className="mt-1 text-sm text-muted-foreground">Adicione um endereço para tê-lo à mão quando precisar.</p>
                  <Button type="button" className="mt-4 min-h-11" onClick={() => store.startAddressEdit()}>
                    <Plus aria-hidden="true" />
                    Adicionar endereço
                  </Button>
                </div>
              </RenderComponent>
            )}
          </Observer>
        </CardContent>
      </Card>

      <Observer>
        {() => (
          <AccountAddressDrawer
            onSave={store.saveAddress}
            isPending={store.isSaving}
            open={store.addressDrawerOpen}
            address={store.editingAddress}
            onOpenChange={(open) => store.setAddressDrawerOpen(open)}
          />
        )}
      </Observer>
    </div>
  );
}
