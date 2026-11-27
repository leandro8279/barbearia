import { resetPassword } from '@/modules/auth/api/auth';

import { HttpError } from '@/shared/lib/http';
import { MobxMutation } from '@/shared/lib/mutation';
import { useSessionStore } from '@/shared/stores/session-store';

import { makeAutoObservable, runInAction } from 'mobx';
import { toast } from 'sonner';

import type { UseFormReturn } from 'react-hook-form';

import type { ResetPasswordValues } from '@/modules/auth/schemas/reset-password.schema';

interface ResetPasswordPageStoreDeps {
  navigate: (path: string) => void;
  form: UseFormReturn<ResetPasswordValues>;
  getToken: () => string;
}

type ResetPasswordPageStoreExclude = 'navigate' | 'form' | 'getToken' | 'resetMutation';

const STRENGTH_LABELS = ['', 'Fraca', 'Média', 'Boa', 'Forte'];

function calculatePasswordStrength(password: string) {
  if (!password) return 0;
  return [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(Boolean).length;
}

export class ResetPasswordPageStore {
  password = '';
  invalidToken = false;
  serverError: string | null = null;

  readonly form: UseFormReturn<ResetPasswordValues>;

  private readonly navigate: (path: string) => void;
  private readonly getToken: () => string;
  private readonly resetMutation = new MobxMutation<{ message: string }, Error, { token: string; password: string }>({
    mutationFn: (input) => resetPassword(input),
  });

  constructor({ navigate, form, getToken }: ResetPasswordPageStoreDeps) {
    this.navigate = navigate;
    this.form = form;
    this.getToken = getToken;

    makeAutoObservable<ResetPasswordPageStore, ResetPasswordPageStoreExclude>(this, { navigate: false, form: false, getToken: false, resetMutation: false }, { autoBind: true });
  }

  // ---------- Dados derivados ----------
  get passwordStrength() {
    return calculatePasswordStrength(this.password);
  }

  get strengthLabel() {
    return STRENGTH_LABELS[this.passwordStrength];
  }

  get strengthColor() {
    const strength = this.passwordStrength;
    if (strength === 1) return 'bg-destructive';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-amber-400';
    return 'bg-emerald-500';
  }

  get strengthSegments() {
    return [0, 1, 2, 3].map((segment) => ({ segment, active: segment < this.passwordStrength }));
  }

  get strengthValueText() {
    return this.strengthLabel || 'Sem senha';
  }

  get strengthHint() {
    return this.password ? `Força da senha: ${this.strengthLabel.toLowerCase()}` : 'Use letras, números e símbolos para uma senha mais forte.';
  }

  // ---------- Estados ----------
  get isSubmitting() {
    return this.resetMutation.isPending;
  }

  get submitLabel() {
    return this.isSubmitting ? 'Salvando…' : 'Salvar nova senha';
  }

  // ---------- Actions ----------
  setPassword(value: string) {
    this.password = value;
  }

  handleSubmit(event?: React.BaseSyntheticEvent) {
    return this.form.handleSubmit(this.submit)(event);
  }

  async submit(values: ResetPasswordValues) {
    this.serverError = null;
    this.invalidToken = false;

    await this.resetMutation.mutateAsync({ token: this.getToken(), password: values.password });

    // mutateAsync do MobxMutation engole o erro; avaliamos a partir do estado da mutation.
    if (this.resetMutation.isError) {
      const error = this.resetMutation.error;
      runInAction(() => {
        if (error instanceof HttpError && error.status === 400) {
          this.invalidToken = true;
          return;
        }
        this.serverError = 'Não foi possível redefinir sua senha agora. Tente novamente.';
      });
      return;
    }

    useSessionStore.getState().clearSession();
    toast.success('Senha redefinida. Entre com sua nova senha.');
    this.navigate('/entrar');
  }
}
