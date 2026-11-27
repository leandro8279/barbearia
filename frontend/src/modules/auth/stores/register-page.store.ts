import { register } from '@/modules/auth/api/auth';

import { HttpError } from '@/shared/lib/http';
import { useSessionStore } from '@/shared/stores/session-store';

import { makeAutoObservable, runInAction } from 'mobx';

import type { UseFormReturn } from 'react-hook-form';

import type { RegisterFormValues } from '@/modules/auth/schemas/register.schema';

interface RegisterPageStoreDeps {
  navigate: (path: string) => void;
  form: UseFormReturn<RegisterFormValues>;
}

type RegisterPageStoreExclude = 'navigate' | 'form';

const STRENGTH_LABELS = ['', 'Fraca', 'Média', 'Boa', 'Forte'];

function calculatePasswordStrength(password: string) {
  if (!password) return 0;
  return [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)].filter(Boolean).length;
}

function registrationErrorMessage(error: unknown) {
  if (error instanceof HttpError && typeof error.details === 'object' && error.details !== null && 'error' in error.details && typeof error.details.error === 'string') {
    return error.details.error;
  }
  return 'Não foi possível criar sua conta. Confira os dados e tente novamente.';
}

export class RegisterPageStore {
  password = '';
  isSubmitting = false;
  serverError: string | null = null;

  private readonly navigate: (path: string) => void;
  readonly form: UseFormReturn<RegisterFormValues>;

  constructor({ navigate, form }: RegisterPageStoreDeps) {
    this.navigate = navigate;
    this.form = form;

    makeAutoObservable<RegisterPageStore, RegisterPageStoreExclude>(this, { navigate: false, form: false }, { autoBind: true });
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
    return [0, 1, 2, 3].map((segment) => ({
      id: segment,
      className: `h-1.5 flex-1 rounded-full ${segment < this.passwordStrength ? this.strengthColor : 'bg-muted'}`,
    }));
  }

  get strengthHint() {
    return this.password ? `Força da senha: ${this.strengthLabel.toLowerCase()}` : 'Use letras, números e símbolos para uma senha mais forte.';
  }

  get strengthAriaText() {
    return this.strengthLabel || 'Sem senha';
  }

  get maxBirthDate() {
    return new Date().toISOString().slice(0, 10);
  }

  get submitLabel() {
    return this.isSubmitting ? 'Criando conta…' : 'Criar conta';
  }

  // ---------- Actions ----------
  setPassword(value: string) {
    this.password = value;
  }

  handleSubmit(event?: React.BaseSyntheticEvent) {
    return this.form.handleSubmit(this.submit)(event);
  }

  async submit(values: RegisterFormValues) {
    this.serverError = null;
    this.form.clearErrors('root.server');
    this.isSubmitting = true;
    try {
      const result = await register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        birthDate: values.birthDate || null,
        reminders: values.reminders,
        termsAccepted: values.termsAccepted,
      });
      useSessionStore.getState().setSession(result.user, result.token);
      this.navigate('/conta');
    } catch (error) {
      const message = registrationErrorMessage(error);
      if (error instanceof HttpError && error.status === 409) {
        if (message.toLowerCase().includes('e-mail')) {
          this.form.setError('email', { type: 'server', message });
          return;
        }
        if (message.toLowerCase().includes('telefone')) {
          this.form.setError('phone', { type: 'server', message });
          return;
        }
      }
      runInAction(() => (this.serverError = message));
    } finally {
      runInAction(() => (this.isSubmitting = false));
    }
  }
}
