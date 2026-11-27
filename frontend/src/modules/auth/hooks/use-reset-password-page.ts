/* eslint-disable react-hooks/refs */
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { resetPasswordSchema, ResetPasswordValues } from '@/modules/auth/schemas/reset-password.schema';
import { ResetPasswordPageStore } from '@/modules/auth/stores/reset-password-page.store';

import { useLocation, useRoute } from 'wouter';

export function useResetPasswordPage() {
  const [, params] = useRoute('/redefinir-senha/:token');
  const [, navigate] = useLocation();
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });

  const latest = useRef({ token: params?.token ?? '' });
  latest.current = { token: params?.token ?? '' };

  const [store] = useState(() => new ResetPasswordPageStore({ navigate, form, getToken: () => latest.current.token }));

  return store;
}
