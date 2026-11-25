import { useEffect, useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Camera, MapPin, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useAccountUser, useUpdateAccountProfile } from '@/modules/account/hooks/use-account-data';
import { AccountAddressDrawer } from '@/modules/account/components/account-address-drawer';
import type { AccountAddress } from '@/modules/account/api/profile';
import { accountProfileSchema, type AccountAddressValues, type AccountProfileValues } from '@/modules/account/schemas/account-profile.schema';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatCPF, formatPhone } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

function profileFormValues(profile: NonNullable<ReturnType<typeof useAccountUser>['data']>): AccountProfileValues {
  return {
    name: profile.name ?? '',
    email: profile.email ?? '',
    originalEmail: profile.email ?? '',
    phone: profile.phone ?? '',
    cpf: profile.cpf?.replace(/\D/g, '') ?? '',
    birthDate: profile.birthDate ?? '',
    currentPassword: '',
  };
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

async function resizeAvatar(file: File): Promise<string> {
  const image = await createImageBitmap(file);
  const largestSide = 256;
  const scale = Math.min(1, largestSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    image.close();
    throw new Error('Não foi possível preparar essa imagem.');
  }
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  for (const quality of [0.72, 0.56, 0.4]) {
    const result = canvas.toDataURL('image/jpeg', quality);
    if (result.length <= 90000) return result;
  }
  throw new Error('Não foi possível reduzir a imagem para o tamanho permitido.');
}

export default function AccountProfilePage() {
  const profileQuery = useAccountUser();
  const updateProfile = useUpdateAccountProfile();
  const form = useForm<AccountProfileValues>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: { name: '', email: '', originalEmail: '', phone: '', cpf: '', birthDate: '', currentPassword: '' },
  });
  const inputId = useId();
  const photoInput = useRef<HTMLInputElement>(null);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AccountAddress | undefined>();
  const email = form.watch('email');
  const originalEmail = form.watch('originalEmail');
  const emailChanged = email.trim().toLowerCase() !== originalEmail.trim().toLowerCase();
  const profile = profileQuery.data;

  useEffect(() => {
    document.title = 'Meu perfil | Barbearia';
  }, []);

  useEffect(() => {
    if (profile) form.reset(profileFormValues(profile));
  }, [form, profile]);

  async function handleSubmit(values: AccountProfileValues) {
    form.clearErrors('root.server');
    try {
      await updateProfile.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''),
        cpf: values.cpf.replace(/\D/g, ''),
        birthDate: values.birthDate || null,
        ...(emailChanged ? { currentPassword: values.currentPassword } : {}),
      });
      toast.success('Seus dados foram atualizados.');
      form.setValue('currentPassword', '');
    } catch (error) {
      form.setError('root.server', { type: 'server', message: error instanceof Error ? error.message : 'Não foi possível salvar seus dados.' });
    }
  }

  async function saveAddress(values: AccountAddressValues) {
    if (!profile) return;
    const address: AccountAddress = { ...values, id: editingAddress?.id ?? crypto.randomUUID(), zip: values.zip.replace(/\D/g, ''), state: values.state.toUpperCase() };
    const addresses = editingAddress ? profile.addresses.map((item) => (item.id === editingAddress.id ? address : item)) : [...profile.addresses, address];
    try {
      await updateProfile.mutateAsync({ addresses });
      toast.success(editingAddress ? 'Endereço atualizado.' : 'Endereço adicionado.');
      setAddressDrawerOpen(false);
      setEditingAddress(undefined);
    } catch (error) {
      throw error;
    }
  }

  async function removeAddress(address: AccountAddress) {
    if (!profile || !window.confirm(`Remover o endereço “${address.label}”?`)) return;
    try {
      await updateProfile.mutateAsync({ addresses: profile.addresses.filter((item) => item.id !== address.id) });
      toast.success('Endereço removido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o endereço.');
    }
  }

  async function updateAvatar(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Escolha uma imagem PNG, JPG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2 MB.');
      return;
    }
    try {
      const avatar = await resizeAvatar(file);
      await updateProfile.mutateAsync({ avatar });
      toast.success('Foto de perfil atualizada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a foto.');
    }
  }

  async function removeAvatar() {
    try {
      await updateProfile.mutateAsync({ avatar: null });
      toast.success('Foto de perfil removida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a foto.');
    }
  }

  function startAddressEdit(address?: AccountAddress) {
    setEditingAddress(address);
    setAddressDrawerOpen(true);
  }

  const header = <PageHeader eyebrow="Minha conta" title="Meu perfil" description="Mantenha seus dados e endereços atualizados." />;

  if (profileQuery.isPending) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-40 rounded-xl" aria-label="Carregando seus dados" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState title="Não foi possível carregar seu perfil" description="Confira sua conexão e tente novamente." onRetry={() => void profileQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {header}

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-20 border border-border">
              <AvatarImage src={profile.avatar ?? undefined} alt={`Foto de ${profile.name}`} />
              <AvatarFallback className="text-xl">{initials(profile.name) || <UserRound aria-hidden="true" />}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile.name}</p>
              <p className="text-sm text-muted-foreground">Foto de perfil</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              id={inputId}
              ref={photoInput}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Escolher foto de perfil"
              disabled={updateProfile.isPending}
              onChange={(event) => {
                void updateAvatar(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            <Button type="button" variant="outline" className="min-h-11" disabled={updateProfile.isPending} onClick={() => photoInput.current?.click()}>
              <Camera aria-hidden="true" />
              Alterar foto
            </Button>
            {profile.avatar && (
              <Button type="button" variant="ghost" className="min-h-11" disabled={updateProfile.isPending} onClick={() => void removeAvatar()}>
                Remover
              </Button>
            )}
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
            <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
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
                {emailChanged && (
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
                )}
              </div>
              {form.formState.errors.root?.server && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.server.message}
                </p>
              )}
              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit" className="min-h-11" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Salvando...' : 'Salvar alterações'}
                </Button>
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
          <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={updateProfile.isPending} onClick={() => startAddressEdit()}>
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </CardHeader>
        <CardContent>
          {profile.addresses.length ?
            <ul className="space-y-3">
              {profile.addresses.map((address) => (
                <li key={address.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium">{address.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {address.street}, {address.number}
                        {address.complement ? ` · ${address.complement}` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.neighborhood} · {address.city}/{address.state} · CEP {address.zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                      </p>
                      {address.reference && <p className="mt-1 text-sm text-muted-foreground">Referência: {address.reference}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:justify-end">
                    <Button type="button" variant="outline" className="min-h-11" disabled={updateProfile.isPending} onClick={() => startAddressEdit(address)}>
                      <Pencil aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 text-destructive hover:text-destructive"
                      disabled={updateProfile.isPending}
                      aria-label={`Remover endereço ${address.label}`}
                      onClick={() => void removeAddress(address)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          : <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
              <MapPin className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-medium">Nenhum endereço salvo</p>
              <p className="mt-1 text-sm text-muted-foreground">Adicione um endereço para tê-lo à mão quando precisar.</p>
              <Button type="button" className="mt-4 min-h-11" onClick={() => startAddressEdit()}>
                <Plus aria-hidden="true" />
                Adicionar endereço
              </Button>
            </div>
          }
        </CardContent>
      </Card>

      <AccountAddressDrawer
        open={addressDrawerOpen}
        address={editingAddress}
        onOpenChange={(open) => {
          setAddressDrawerOpen(open);
          if (!open) setEditingAddress(undefined);
        }}
        onSave={saveAddress}
        isPending={updateProfile.isPending}
      />
    </div>
  );
}
