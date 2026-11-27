import { AccountAddress, AccountProfile, getAccountProfile, updateAccountProfile, UpdateAccountProfileInput } from '@/modules/account/api/profile';

import { MobxMutation } from '@/shared/lib/mutation';
import { MobxQuery } from '@/shared/lib/query';
import { queryClient } from '@/shared/lib/query-client';
import { useSessionStore } from '@/shared/stores/session-store';

import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { toast } from 'sonner';

import type { UseFormReturn } from 'react-hook-form';
import type { AccountAddressValues, AccountProfileValues } from '@/modules/account/schemas/account-profile.schema';

type AccountProfilePageStoreExclude = 'profileQuery' | 'updateProfileMutation';

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

export class AccountProfilePageStore {
  addressDrawerOpen = false;
  editingAddress: AccountAddress | undefined = undefined;
  profileServerError: string | null = null;

  private readonly profileQuery = new MobxQuery<AccountProfile>();
  private readonly updateProfileMutation = new MobxMutation<AccountProfile, Error, UpdateAccountProfileInput>({
    mutationFn: (input) => updateAccountProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['users', 'me'], profile);
      useSessionStore.getState().setUser({ id: profile.id, name: profile.name, role: profile.role, permissions: profile.permissions });
    },
  });

  constructor() {
    makeAutoObservable<AccountProfilePageStore, AccountProfilePageStoreExclude>(this, { profileQuery: false, updateProfileMutation: false }, { autoBind: true });
  }

  // ---------- Query ----------
  private get profileResult() {
    return this.profileQuery.query({ queryKey: ['users', 'me'], queryFn: getAccountProfile, staleTime: 60_000 });
  }

  // ---------- Dados derivados ----------
  get profile() {
    return this.profileResult.data;
  }

  get profileFormValues(): AccountProfileValues | null {
    const profile = this.profile;
    if (!profile) return null;
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

  get profileInitials() {
    return (this.profile?.name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  get avatarSrc() {
    return this.profile?.avatar ?? undefined;
  }

  get avatarAlt() {
    return `Foto de ${this.profile?.name ?? ''}`;
  }

  get addressItems() {
    return (this.profile?.addresses ?? []).map((address) => ({
      address,
      street: `${address.street}, ${address.number}${address.complement ? ` · ${address.complement}` : ''}`,
      area: `${address.neighborhood} · ${address.city}/${address.state} · CEP ${address.zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')}`,
      reference: address.reference ? `Referência: ${address.reference}` : null,
    }));
  }

  // ---------- Estados ----------
  get isPending() {
    return this.profileResult.isPending;
  }

  get isError() {
    return this.profileResult.isError;
  }

  get isSuccess() {
    return this.profileResult.isSuccess;
  }

  get isSaving() {
    return this.updateProfileMutation.isPending;
  }

  // ---------- Regras ----------
  isEmailChanged(email: string, originalEmail: string) {
    return email.trim().toLowerCase() !== originalEmail.trim().toLowerCase();
  }

  // Mantém o formulário (react-hook-form) sincronizado com o perfil carregado/atualizado.
  bindForm(form: Pick<UseFormReturn<AccountProfileValues>, 'reset'>) {
    return reaction(
      () => this.profileFormValues,
      (values) => {
        if (values) form.reset(values);
      },
      { fireImmediately: true },
    );
  }

  // mutateAsync do MobxMutation engole o erro; relançamos a partir do estado da mutation.
  private async update(input: UpdateAccountProfileInput) {
    await this.updateProfileMutation.mutateAsync(input);
    if (this.updateProfileMutation.isError) throw this.updateProfileMutation.error;
  }

  // ---------- Actions ----------
  refetch() {
    void this.profileResult.refetch();
  }

  async submitProfile(values: AccountProfileValues) {
    this.profileServerError = null;
    const emailChanged = this.isEmailChanged(values.email, values.originalEmail);
    try {
      await this.update({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''),
        cpf: values.cpf.replace(/\D/g, ''),
        birthDate: values.birthDate || null,
        ...(emailChanged ? { currentPassword: values.currentPassword } : {}),
      });
      toast.success('Seus dados foram atualizados.');
    } catch (error) {
      runInAction(() => {
        this.profileServerError = error instanceof Error ? error.message : 'Não foi possível salvar seus dados.';
      });
    }
  }

  startAddressEdit(address?: AccountAddress) {
    this.editingAddress = address;
    this.addressDrawerOpen = true;
  }

  setAddressDrawerOpen(open: boolean) {
    this.addressDrawerOpen = open;
    if (!open) this.editingAddress = undefined;
  }

  async saveAddress(values: AccountAddressValues) {
    const profile = this.profile;
    if (!profile) return;
    const editing = this.editingAddress;
    const address: AccountAddress = { ...values, id: editing?.id ?? crypto.randomUUID(), zip: values.zip.replace(/\D/g, ''), state: values.state.toUpperCase() };
    const addresses = editing ? profile.addresses.map((item) => (item.id === editing.id ? address : item)) : [...profile.addresses, address];

    // Erros propagam para o drawer, que os exibe no formulário.
    await this.update({ addresses });
    toast.success(editing ? 'Endereço atualizado.' : 'Endereço adicionado.');
    runInAction(() => {
      this.addressDrawerOpen = false;
      this.editingAddress = undefined;
    });
  }

  async removeAddress(address: AccountAddress) {
    const profile = this.profile;
    if (!profile || !window.confirm(`Remover o endereço “${address.label}”?`)) return;
    try {
      await this.update({ addresses: profile.addresses.filter((item) => item.id !== address.id) });
      toast.success('Endereço removido.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o endereço.');
    }
  }

  async updateAvatar(file: File | undefined) {
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
      await this.update({ avatar });
      toast.success('Foto de perfil atualizada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a foto.');
    }
  }

  async removeAvatar() {
    try {
      await this.update({ avatar: null });
      toast.success('Foto de perfil removida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a foto.');
    }
  }
}
