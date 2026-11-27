import { login } from '@/modules/auth/api/auth';

import { HttpError } from '@/shared/lib/http';
import { MobxMutation } from '@/shared/lib/mutation';
import { useSessionStore } from '@/shared/stores/session-store';

import { makeAutoObservable } from 'mobx';

import type { UseFormReturn } from 'react-hook-form';

import type { StaffLoginValues } from '@/modules/auth/schemas/staff-login.schema';
import type { UserRole } from '@/shared/types/domain';

type LoginResult = Awaited<ReturnType<typeof login>>;

interface StaffLoginPageStoreDeps {
  navigate: (path: string) => void;
  form: UseFormReturn<StaffLoginValues>;
}

type StaffLoginPageStoreExclude = 'navigate' | 'form' | 'loginMutation';

function getLoginError(error: unknown) {
  if (error instanceof HttpError && error.status === 429) return 'Muitas tentativas. Aguarde antes de tentar novamente.';
  return 'E-mail ou senha inválidos.';
}

function destinationForRole(role: UserRole) {
  return role === 'barber' ? '/admin/meu-dia' : '/admin';
}

export class StaffLoginPageStore {
  serverError: string | null = null;

  private readonly navigate: (path: string) => void;
  readonly form: UseFormReturn<StaffLoginValues>;

  private readonly loginMutation = new MobxMutation<LoginResult, unknown, StaffLoginValues>({
    mutationFn: (values) => login(values.email, values.password, true),
  });

  constructor({ navigate, form }: StaffLoginPageStoreDeps) {
    this.navigate = navigate;
    this.form = form;

    makeAutoObservable<StaffLoginPageStore, StaffLoginPageStoreExclude>(this, { navigate: false, form: false, loginMutation: false }, { autoBind: true });
  }

  // ---------- Estados ----------
  get isSubmitting() {
    return this.loginMutation.isPending;
  }

  // ---------- Dados derivados ----------
  get submitLabel() {
    return this.isSubmitting ? 'Entrando…' : 'Entrar';
  }

  get showDemoAccounts() {
    return import.meta.env.DEV;
  }

  // ---------- Actions ----------
  handleSubmit(event?: React.BaseSyntheticEvent) {
    return this.form.handleSubmit(this.submit)(event);
  }

  async submit(values: StaffLoginValues) {
    this.serverError = null;

    // mutateAsync do MobxMutation engole o erro; lemos o resultado do estado da mutation.
    await this.loginMutation.mutateAsync(values);

    if (this.loginMutation.isError) {
      this.serverError = getLoginError(this.loginMutation.error);
      return;
    }

    const result = this.loginMutation.data;
    if (!result) return;

    useSessionStore.getState().setSession(result.user, result.token, values.rememberOnDevice);
    this.navigate(destinationForRole(result.user.role));
  }
}
