/* eslint-disable react-hooks/refs */
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { LoginFormValues, loginSchema } from '@/modules/auth/schemas/login.schema';
import { LoginPageStore } from '@/modules/auth/stores/login-page.store';

import { useOverlay } from '@/shared/hooks/use-overlay';

import { useLocation, useSearch } from 'wouter';

export function useLoginPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const recoveryOverlay = useOverlay('recuperar');
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });

  const latest = useRef({ search, recoveryOverlay });
  latest.current = { search, recoveryOverlay };

  const [store] = useState(
    () =>
      new LoginPageStore({
        navigate,
        form,
        getSearch: () => latest.current.search,
        getRecoveryOverlay: () => latest.current.recoveryOverlay,
      }),
  );

  return store;
}
