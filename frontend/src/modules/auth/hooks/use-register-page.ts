import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { RegisterFormValues, registerSchema } from '@/modules/auth/schemas/register.schema';
import { RegisterPageStore } from '@/modules/auth/stores/register-page.store';

import { useLocation } from 'wouter';

export function useRegisterPage() {
  const [, navigate] = useLocation();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', birthDate: '', password: '', confirmPassword: '', termsAccepted: false, reminders: false },
  });
  const [store] = useState(() => new RegisterPageStore({ navigate, form }));

  return store;
}
