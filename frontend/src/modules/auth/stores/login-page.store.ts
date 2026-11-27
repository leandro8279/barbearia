import { login } from '@/modules/auth/api/auth';

import { HttpError } from '@/shared/lib/http';
import { useSessionStore } from '@/shared/stores/session-store';

import { makeAutoObservable, runInAction } from 'mobx';

import type { UseFormReturn } from 'react-hook-form';

import type { LoginFormValues } from '@/modules/auth/schemas/login.schema';

import type { UserRole } from '@/shared/types/domain';

interface RecoveryOverlay {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

interface LoginPageStoreDeps {
  navigate: (path: string) => void;
  form: UseFormReturn<LoginFormValues>;
  getSearch: () => string;
  getRecoveryOverlay: () => RecoveryOverlay;
}

type LoginPageStoreExclude = 'navigate' | 'form' | 'getSearch' | 'getRecoveryOverlay' | 'isRecoveryOpen' | 'documentTitle';

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

export class LoginPageStore {
  showPassword = false;
  isSubmitting = false;
  serverError: string | null = null;

  private readonly navigate: (path: string) => void;
  private readonly getSearch: () => string;
  private readonly getRecoveryOverlay: () => RecoveryOverlay;
  readonly form: UseFormReturn<LoginFormValues>;

  constructor({ navigate, form, getSearch, getRecoveryOverlay }: LoginPageStoreDeps) {
    this.navigate = navigate;
    this.form = form;
    this.getSearch = getSearch;
    this.getRecoveryOverlay = getRecoveryOverlay;

    makeAutoObservable<LoginPageStore, LoginPageStoreExclude>(
      this,
      { navigate: false, form: false, getSearch: false, getRecoveryOverlay: false, isRecoveryOpen: false, documentTitle: false },
      { autoBind: true },
    );
  }

  // ---------- Dados derivados ----------
  get passwordInputType() {
    return this.showPassword ? 'text' : 'password';
  }

  get passwordToggleLabel() {
    return this.showPassword ? 'Ocultar senha' : 'Mostrar senha';
  }

  get submitLabel() {
    return this.isSubmitting ? 'Entrando…' : 'Entrar';
  }

  // Não observável: depende do overlay (hook externo). Ver nota no prompt.
  get isRecoveryOpen() {
    return this.getRecoveryOverlay().isOpen;
  }

  get documentTitle() {
    return `${this.isRecoveryOpen ? 'Recuperar senha' : 'Entrar'} | Barbearia`;
  }

  // ---------- Actions ----------
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  setRecoveryOpen(open: boolean) {
    this.getRecoveryOverlay().setOpen(open);
  }

  handleSubmit(event?: React.BaseSyntheticEvent) {
    return this.form.handleSubmit(this.submit)(event);
  }

  async submit(values: LoginFormValues) {
    this.serverError = null;
    this.isSubmitting = true;
    try {
      const result = await login(values.identifier, values.password);
      useSessionStore.getState().setSession(result.user, result.token);
      this.navigate(destinationForRole(result.user.role, this.getSearch()));
    } catch (error) {
      runInAction(() => (this.serverError = loginErrorMessage(error)));
    } finally {
      runInAction(() => (this.isSubmitting = false));
    }
  }
}
